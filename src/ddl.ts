import type {
    ColumnTypes,
    CreateIndexOptions,
    CreateTableOptions,
    CreateViewConfig,
    RowData,
    SetupTableIndexOptions,
    SetupTableOptions,
} from "./types.ts";
import { tsvector } from "./helpers.ts";

//#region Table Operations

/**
 * Generates a `CREATE TABLE IF NOT EXISTS` SQL statement.
 *
 * Outputs raw SQL with column names double-quoted. Supports an optional
 * primary key via the `pk` option.
 *
 * @param name - Table name.
 * @param cols - Column definitions: `{ columnName: "SQL_TYPE", ... }`.
 * @param opt - Options: `pk` for primary key column name.
 * @param acc - Accumulator string for chaining (internal use).
 * @returns SQL statement terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.createTable("plant", { name: "TEXT", type: "TEXT", age: "INT" });
 * // CREATE TABLE IF NOT EXISTS "plant" ("name" TEXT, "type" TEXT, "age" INT);
 *
 * xsql.createTable("animal", { name: "TEXT", age: "INT" }, { pk: "name" });
 * // CREATE TABLE IF NOT EXISTS "animal" ("name" TEXT, "age" INT, PRIMARY KEY("name"));
 * ```
 */
export function createTable(
    name: string,
    cols: ColumnTypes,
    opt: CreateTableOptions = {},
    acc: string = "",
): string {
    acc += `CREATE TABLE IF NOT EXISTS "${name}" (`;
    for (const k in cols) {
        acc += `"${k}" ${cols[k]}, `;
    }
    if (opt.pk) acc += `PRIMARY KEY("${opt.pk}"), `;
    return acc.replace(/, $/, "") + `);\n`;
}

//#endregion

//#region Index Operations

/**
 * Generates a `CREATE INDEX IF NOT EXISTS` SQL statement.
 *
 * @param name - Index name.
 * @param table - Table name the index is created on.
 * @param expr - Index expression (e.g. `'"column_name"'` or a tsvector expression).
 * @param opt - Options: `method` for the indexing method (`BTREE`, `GIN`, `GiST`, `HASH`).
 * @param acc - Accumulator string for chaining (internal use).
 * @returns SQL statement terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.createIndex("food_code_idx", "food", '"code"');
 * // CREATE INDEX IF NOT EXISTS "food_code_idx" ON "food" ("code");
 *
 * xsql.createIndex("food_type_idx", "food", '"type"', { method: "GIN" });
 * // CREATE INDEX IF NOT EXISTS "food_type_idx" ON "food" USING GIN ("type");
 * ```
 */
export function createIndex(
    name: string,
    table: string,
    expr: string,
    opt: CreateIndexOptions = {},
    acc: string = "",
): string {
    acc += `CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" `;
    if (opt.method) acc += `USING ${opt.method} `;
    return acc + `(${expr});\n`;
}

/**
 * Generates a `CREATE UNIQUE INDEX IF NOT EXISTS` SQL statement.
 *
 * Simplified version that emits the index creation without quoting the
 * name, allowing the caller to control naming conventions.
 *
 * @param indexName - The name for the unique index.
 * @param tableName - The table on which to create the index.
 * @param columns - Column(s) expression for the index.
 * @returns SQL statement terminated with `;`.
 *
 * @example
 * ```ts
 * xsql.createUniqueIndex("idx_users_email", "users", '"email"');
 * // CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users ("email");
 * ```
 */
export function createUniqueIndex<Table extends string>(
    indexName: string,
    tableName: Table,
    columns: string,
): string {
    return `CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns});`;
}

//#endregion

//#region View Operations

/**
 * Generates a `CREATE OR REPLACE VIEW` SQL statement.
 *
 * @param name - View name.
 * @param query - The SELECT query that defines the view.
 * @param _opt - Unused; reserved for future options.
 * @param acc - Accumulator string for chaining (internal use).
 * @returns SQL statement terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.createView("food_code", 'SELECT "code" FROM "food"');
 * // CREATE OR REPLACE VIEW "food_code" AS SELECT "code" FROM "food";
 * ```
 */
export function createView(
    name: string,
    query: string,
    _opt: object | null = null,
    acc: string = "",
): string {
    acc += `CREATE OR REPLACE VIEW "${name}" AS ${query};\n`;
    return acc;
}

/**
 * Builds a `CREATE OR REPLACE VIEW` statement from a structured
 * configuration object.
 *
 * Supports the full view DDL: named columns, FROM with alias,
 * optional JOINs (INNER, LEFT, RIGHT, FULL), and optional GROUP BY.
 *
 * @param config - View configuration object.
 * @returns SQL statement terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.buildView({
 *   name: "user_profiles",
 *   columns: ["user_id", "user_name", "profile_bio"],
 *   from: { table: "users", alias: "u" },
 *   select: ['u.id AS "user_id"', 'u.name AS "user_name"'],
 *   joins: [{
 *     type: "LEFT",
 *     table: "profiles",
 *     alias: "p",
 *     condition: "u.id = p.user_id"
 *   }],
 * });
 * ```
 */
export function buildView<ViewColumn extends string = string>(
    config: CreateViewConfig<ViewColumn>,
): string {
    const formattedCols = config.columns.map((c) => `"${c}"`).join(", ");

    let query = `CREATE OR REPLACE VIEW "${config.name}" (${formattedCols}) AS\n`;
    query += `SELECT\n  ${config.select.join(",\n  ")}\n`;
    query += `FROM "${config.from.table}" ${config.from.alias}\n`;

    if (config.joins) {
        for (const j of config.joins) {
            query += `${j.type} JOIN "${j.table}" ${j.alias} ON ${j.condition}\n`;
        }
    }

    if (config.groupBy) {
        query += `GROUP BY ${config.groupBy}\n`;
    }

    return query + ";\n";
}

//#endregion

//#region Index Setup

/**
 * Generates SQL statements for setting up indexes and full-text search
 * views on a table.
 *
 * If `opt.tsvector` is provided, creates:
 * 1. A view `<table>_tsvector` with a computed tsvector column.
 * 2. (If `opt.index` is true) a GIN index over the tsvector expression.
 *
 * If `opt.index` is true, creates individual indexes on every non-PK column.
 *
 * @param table - Table name.
 * @param cols - Column type definitions.
 * @param opt - Setup options: `pk`, `index`, `tsvector`.
 * @param acc - Accumulator string for chaining (internal use).
 * @returns Concatenated SQL statements.
 *
 * @example
 * ```ts
 * xsql.setupTableIndex("articles", { title: "TEXT", content: "TEXT" }, {
 *   tsvector: { title: "A", content: "B" },
 *   index: true,
 * });
 * // Creates tsvector view, GIN index, and per-column indexes
 * ```
 */
export function setupTableIndex(
    table: string,
    cols: ColumnTypes,
    opt: SetupTableIndexOptions = {},
    acc: string = "",
): string {
    if (opt.tsvector) {
        const tv = tsvector(opt.tsvector);
        acc += createView(
            table + "_tsvector",
            `SELECT *, ${tv} AS "tsvector" FROM "${table}"`,
        );
        if (opt.index) {
            acc += createIndex(table + "_tsvector_idx", table, `(${tv})`, {
                method: "GIN",
            });
        }
    }
    if (opt.index) {
        for (const k in cols) {
            if (cols[k] == null || k === opt.pk) continue;
            const knam = k.replace(/\W+/g, "_").toLowerCase();
            acc += createIndex(`${table}_${knam}_idx`, table, `"${k}"`);
        }
    }
    return acc;
}

/**
 * High-level convenience function that generates the full table setup:
 * `CREATE TABLE`, optional `INSERT INTO`, and index/full-text search setup.
 *
 * Combines {@link createTable}, {@link insertInto}, and
 * {@link setupTableIndex} into a single call.
 *
 * @param name - Table name.
 * @param cols - Column type definitions.
 * @param rows - Optional rows to insert after creation (raw SQL style).
 * @param opt - Setup options: `pk`, `index`, `tsvector`.
 * @param acc - Accumulator string for chaining (internal use).
 * @returns Concatenated SQL statements.
 *
 * @example
 * ```ts
 * xsql.setupTable("food", { code: "TEXT", name: "TEXT" },
 *   [{ code: "F1", name: "Mango" }],
 *   { pk: "code", index: true });
 * ```
 */
export function setupTable(
    name: string,
    cols: ColumnTypes,
    rows: Iterable<RowData> | null = null,
    opt: SetupTableOptions = {},
    acc: string = "",
): string {
    acc = createTable(name, cols, opt, acc);
    if (rows) acc = insertInto(name, rows, opt, acc);
    return setupTableIndex(name, cols, opt, acc);
}

//#endregion

//#region Utility

/**
 * Generates a query that checks whether a table exists in the database.
 *
 * Queries `information_schema.tables`.
 *
 * @param name - Table name to check.
 * @returns SQL `SELECT EXISTS(...)` statement terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.tableExists("food");
 * // SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');
 * ```
 */
export function tableExists(name: string): string {
    return `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${name}');\n`;
}

//#endregion

// InsertInto is defined below in this file to avoid circular imports
import { insertInto } from "./dml.ts";
