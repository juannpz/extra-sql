import type {
    ColumnTypes,
    InsertIntoDataOptions,
    InsertIntoOptions,
    QueryData,
    RowData,
    SelectDataOptions,
    UpdateDataOptions,
} from "./types.ts";
import { addRow, asArray, buildWhereClause, formatData } from "./helpers.ts";

/**
 * Generates an `INSERT INTO` SQL statement with `$$...$$`-delimited inline values.
 *
 * This is the legacy (raw SQL) style meant for script generation or trusted
 * contexts. For runtime queries against a database, prefer the parameterized
 * {@link insertIntoData} which returns `{ query, data }`.
 *
 * Supports `ON CONFLICT DO NOTHING` via the `pk` option and optional
 * `RETURNING *`.
 *
 * @param table - Table name.
 * @param rows - Iterable of row objects to insert.
 * @param opt - Options: `pk` for conflict handling, `returning` for RETURNING clause.
 * @param acc - Accumulator string for chaining (internal use).
 * @returns SQL statement terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.insertInto("food", [{ code: "F1", name: "Mango" }], { returning: true });
 * // INSERT INTO "food" ("code", "name") VALUES
 * // ($$F1$$, $$Mango$$) RETURNING *;
 * ```
 */
export function insertInto(
    table: string,
    rows: Iterable<RowData>,
    opt: InsertIntoOptions = {},
    acc: string = "",
): string {
    let i = -1;
    acc += `INSERT INTO "${table}" (`;
    for (const val of rows) {
        acc = addRow(val, acc, ++i);
    }
    acc = acc.replace(/\),\n\($/, "") + ")";
    if (opt.pk) acc += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
    if (opt.returning) acc += " RETURNING *";
    return acc + ";\n";
}

/**
 * Generates a parameterized `CREATE TABLE IF NOT EXISTS` query.
 *
 * Returns a {@link QueryData} object with a SQL string containing
 * column type placeholders and an empty data array (the types are
 * embedded directly in the SQL, not parameterized).
 *
 * @param table - Table name.
 * @param cols - Column type definitions.
 * @param pkeys - Primary key column(s). Can be a single string or iterable.
 * @returns QueryData object with the SQL query and an empty data array.
 *
 * @example
 * ```ts
 * xsql.createTableData("users", { id: "SERIAL", name: "TEXT" }, "id");
 * // { query: 'CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL, "name" TEXT, PRIMARY KEY("id"));', data: [] }
 * ```
 */
export function createTableData(
    table: string,
    cols: ColumnTypes,
    pkeys?: string | Iterable<string>,
): QueryData {
    return {
        query: `CREATE TABLE IF NOT EXISTS "${table}" (` +
            `${formatData(cols, '"%k" %v', ", ")}` +
            (pkeys
                ? `, PRIMARY KEY(${formatData(asArray(pkeys) as unknown as RowData, '"%v"', ", ")})`
                : ``) +
            `);`,
        data: [],
    };
}

/**
 * Generates a parameterized `UPDATE` query.
 *
 * Returns a {@link QueryData} object where the `query` contains `$N`
 * placeholders and the `data` array contains the corresponding values
 * in the correct order.
 *
 * @param table - Table name.
 * @param set - Columns to update with their new values: `{ column: value }`.
 * @param where - WHERE conditions: `{ column: value }`.
 * @param op - Default comparison operator for WHERE values (default `"="`).
 * @param sep - Logical separator for WHERE conditions (default `"AND"`).
 * @param opt - Options: `returning` to append `RETURNING *`.
 * @returns QueryData with parameterized update query.
 *
 * @example
 * ```ts
 * xsql.updateData("users", { name: "Alice" }, { id: 1 }, "=", "AND", { returning: true });
 * // { query: 'UPDATE "users" SET "name" = $1 WHERE "id" = $2 RETURNING *;', data: ["Alice", 1] }
 * ```
 */
export function updateData(
    table: string,
    set: RowData,
    where: RowData,
    op: string = "=",
    sep: string = "AND",
    opt: UpdateDataOptions = {},
): QueryData {
    const par: unknown[] = [];
    const setStr = formatData(set || {}, '"%k" = $%i', ", ", 1, par);
    const exp = buildWhereClause(where, op, sep, par.length + 1, par);
    const returningClause = opt.returning ? " RETURNING *" : "";
    return {
        query: `UPDATE "${table}" SET ${setStr}${exp ? " WHERE " + exp : ""}${returningClause};`,
        data: par,
    };
}

/**
 * Generates a parameterized arithmetic `UPDATE` query.
 *
 * Produces `SET "col" = "col" + $N` for each column in the `increments`
 * object, allowing atomic increment/decrement operations at the database
 * level (no read-before-write race conditions).
 *
 * @param table - Table name.
 * @param increments - Columns and the values to increment/decrement by.
 * @param where - WHERE conditions to identify the row(s).
 * @param par - Optional pre-populated parameter array (for chaining).
 * @returns QueryData with `RETURNING *` appended.
 *
 * @example
 * ```ts
 * xsql.incrementData("users", { login_count: 1 }, { id: 42 });
 * // { query: 'UPDATE "users" SET "login_count" = "login_count" + $1 WHERE "id" = $2 RETURNING *;', data: [1, 42] }
 * ```
 */
export function incrementData(
    table: string,
    increments: RowData,
    where: RowData,
    par: unknown[] = [],
): QueryData {
    const startIndex = par.length + 1;

    const setStr = Object.keys(increments)
        .map((k, idx) => {
            par.push(increments[k]);
            return `"${k}" = "${k}" + $${startIndex + idx}`;
        })
        .join(", ");

    const exp = buildWhereClause(where, "=", "AND", par.length + 1, par);

    return {
        query: `UPDATE "${table}" SET ${setStr}${exp ? " WHERE " + exp : ""} RETURNING *;`,
        data: par,
    };
}

/**
 * Generates a parameterized `SELECT` query.
 *
 * Supports WHERE conditions, ORDER BY, LIMIT, and OFFSET via the
 * {@link SelectDataOptions} parameter.
 *
 * @param tab - Table name.
 * @param whr - WHERE conditions: `{ column: value }`.
 * @param op - Default comparison operator for WHERE values (default `"="`).
 * @param sep - Logical separator for WHERE conditions (default `"AND"`).
 * @param opt - Options: `columns`, `limit`, `offset`, `orderBy`, `orderDirection`.
 * @returns QueryData with parameterized SELECT query.
 *
 * @example
 * ```ts
 * xsql.selectData("users", { active: true }, "=", "AND", { limit: 10, offset: 20 });
 * // { query: 'SELECT * FROM "users" WHERE "active" = $1 LIMIT 10 OFFSET 20;', data: [true] }
 * ```
 */
export function selectData(
    tab: string,
    whr: RowData,
    op: string = "=",
    sep: string = "AND",
    opt: SelectDataOptions = {},
): QueryData {
    const par: unknown[] = [];
    const exp = buildWhereClause(whr, op, sep, 1, par);

    const col = opt.columns || "*";
    let query = `SELECT ${col} FROM "${tab}"${exp ? " WHERE " + exp : ""}`;

    if (opt.orderBy) {
        query += ` ORDER BY "${opt.orderBy}" ${opt.orderDirection || "ASC"}`;
    }

    if (opt.limit !== undefined) {
        query += ` LIMIT ${opt.limit}`;
    }

    if (opt.offset !== undefined) {
        query += ` OFFSET ${opt.offset}`;
    }

    return {
        query: query + ";",
        data: par,
    };
}

/**
 * Generates a parameterized `INSERT INTO` query for single or multiple rows.
 *
 * Returns a {@link QueryData} object with `$N` placeholders for safe
 * parameterized execution. Supports bulk inserts by passing multiple
 * row objects in the `rows` array.
 *
 * @param table - Table name.
 * @param rows - Array of row objects to insert.
 * @param opt - Options: `returning` to append `RETURNING *`.
 * @returns QueryData with parameterized INSERT query.
 *
 * @example
 * ```ts
 * xsql.insertIntoData("users", [{ id: 1, name: "Alice" }]);
 * // { query: 'INSERT INTO "users" ("id", "name") VALUES ($1, $2);', data: [1, "Alice"] }
 *
 * xsql.insertIntoData("users", [
 *   { id: 2, name: "Bob" },
 *   { id: 3, name: "Charlie" },
 * ]);
 * // { query: 'INSERT INTO "users" ("id", "name") VALUES ($1, $2), ($3, $4);', data: [2, "Bob", 3, "Charlie"] }
 * ```
 */
export function insertIntoData(
    table: string,
    rows: RowData[],
    opt: InsertIntoDataOptions = {},
): QueryData {
    if (!rows || rows.length === 0) {
        return { query: "", data: [] };
    }

    const par: unknown[] = [];
    const keys = Object.keys(rows[0]);
    const into = keys.map((k) => `"${k}"`).join(", ");

    const valuesClauses: string[] = [];
    let paramIndex = 1;

    for (const row of rows) {
        const rowPlaceholders: string[] = [];
        for (const key of keys) {
            par.push(row[key]);
            rowPlaceholders.push(`$${paramIndex++}`);
        }
        valuesClauses.push(`(${rowPlaceholders.join(", ")})`);
    }

    const returningClause = opt.returning ? " RETURNING *" : "";

    return {
        query: `INSERT INTO "${table}" (${into}) VALUES ${
            valuesClauses.join(", ")
        }${returningClause};`,
        data: par,
    };
}

/**
 * Generates a parameterized `DELETE` query.
 *
 * @param table - Table name.
 * @param where - WHERE conditions: `{ column: value }`.
 * @param op - Default comparison operator for WHERE values (default `"="`).
 * @param sep - Logical separator for WHERE conditions (default `"AND"`).
 * @returns QueryData with parameterized DELETE query.
 *
 * @example
 * ```ts
 * xsql.deleteData("users", { id: 1 });
 * // { query: 'DELETE FROM "users" WHERE "id" = $1;', data: [1] }
 * ```
 */
export function deleteData(
    table: string,
    where: RowData,
    op: string = "=",
    sep: string = "AND",
): QueryData {
    const par: unknown[] = [];
    const exp = buildWhereClause(where, op, sep, 1, par);
    return {
        query: `DELETE FROM "${table}"${exp ? " WHERE " + exp : ""};`,
        data: par,
    };
}
