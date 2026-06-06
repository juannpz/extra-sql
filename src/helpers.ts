import type { ColumnWeights, RowData } from "./types.ts";
import { isQueryCondition } from "./utils.ts";

/**
 * Ensures a value is wrapped in an array.
 *
 * If the input is already an array, it is returned as-is.
 * If the input is a string or lacks an iterator, it is wrapped in `[x]`.
 * Otherwise, the iterable is converted to an array via `Array.from`.
 *
 * @param x - Value to normalize.
 * @returns The value as an array.
 * @internal
 */
export function asArray<T>(x: unknown): T[] {
    if (Array.isArray(x)) return x;
    if (
        x == null || typeof x === "string" ||
        typeof (x as Iterable<T>)[Symbol.iterator] !== "function"
    ) return [x as T];
    return Array.from(x as Iterable<T>);
}

/**
 * Formats an object's key-value pairs using a template string.
 *
 * Supports three placeholder tokens:
 * - `%k` – replaced with the key
 * - `%v` – replaced with the stringified value
 * - `%i` – replaced with the current sequential index
 *
 * Optionally collects the raw values into a provided array (used for
 * building parameterized queries).
 *
 * @param obj - The object whose entries to format.
 * @param fmt - Format template (e.g. `'"%k" = $%i'`).
 * @param sep - Separator between each formatted entry (e.g. `", "`).
 * @param i - Starting index for `%i` placeholders (defaults to 0).
 * @param val - Optional array to push values into (for parameterized queries).
 * @returns The formatted string.
 * @internal
 */
export function formatData(
    obj: RowData,
    fmt: string,
    sep: string,
    i: number = 0,
    val?: unknown[],
): string {
    const a: string[] = [];
    const ve = Array.isArray(val);
    i = i || (ve ? val.length : 0);
    for (const k in obj) {
        const v = obj[k];
        a.push(
            fmt.replace(/%k/g, k).replace(/%v/g, String(v)).replace(
                /%i/g,
                String(i++),
            ),
        );
        if (ve) val.push(v);
    }
    return a.join(sep);
}

/**
 * Appends a single row to an accumulating INSERT INTO SQL string.
 *
 * On the first call (i === 0) the column names are extracted from the
 * row keys and the `VALUES` clause is opened. Each call appends a tuple
 * with `$$value$$`-delimited entries.
 *
 * @param row - The row data to add.
 * @param acc - Accumulator SQL string.
 * @param i - Current row index (0 on first call).
 * @returns The updated accumulator string.
 * @internal
 */
export function addRow(row: RowData, acc: string = "", i: number = 0): string {
    if (i === 0) {
        for (const k in row) {
            acc += `"${k}", `;
        }
        acc = acc.endsWith(", ") ? acc.substring(0, acc.length - 2) : acc;
        acc += ") VALUES\n(";
    }
    for (const k in row) {
        acc += row[k] == null ? "NULL, " : `$$${row[k]}$$, `;
    }
    acc = acc.endsWith(", ") ? acc.substring(0, acc.length - 2) : acc;
    acc += "),\n(";
    return acc;
}

/**
 * Builds a tsvector concatenation expression for full-text search indexing.
 *
 * For each column with an assigned weight, generates:
 * ```
 * setweight(to_tsvector('english', "colName"), 'weight')||
 * ```
 * The trailing `||` is stripped from the final result.
 *
 * @param cols - Column weight configuration.
 * @returns The tsvector expression string.
 * @internal
 */
export function tsvector(cols: ColumnWeights): string {
    let acc = "";
    for (const k in cols) {
        if (cols[k]) {
            acc += `setweight(to_tsvector('english', "${k}"), '${cols[k]}')||`;
        }
    }
    return acc.replace(/\|\|$/, "");
}

/**
 * Constructs a parameterized WHERE clause from a conditions object.
 *
 * Handles both plain values (using a default operator) and
 * {@link QueryCondition} objects for specialized operators like
 * `IN`, `>`, `LIKE`, `NOT`, etc.
 *
 * When a `QueryCondition` has `op: "IN"` and `val` is an array,
 * the array elements are expanded into individual `$N` placeholders:
 * `"col" IN ($1, $2, $3)`.
 *
 * @param whr - Object mapping column names to values or QueryCondition objects.
 * @param defaultOp - Default operator for plain values (e.g. `"="`).
 * @param sep - Separator between conditions (e.g. `"AND"`).
 * @param startIndex - Starting placeholder index (typically 1).
 * @param par - Array to push parameter values into.
 * @returns The constructed WHERE clause (without the "WHERE" keyword).
 * @internal
 */
export function buildWhereClause(
    whr: RowData,
    defaultOp: string,
    sep: string,
    startIndex: number,
    par: unknown[],
): string {
    const conditions: string[] = [];
    let index = startIndex;

    for (const [k, v] of Object.entries(whr || {})) {
        if (isQueryCondition(v)) {
            const opUpper = (v.op as string).toUpperCase();
            if (opUpper === "IN" && Array.isArray(v.val)) {
                const arr = v.val as unknown[];
                const placeholders = arr.map(() => `$${index++}`);
                conditions.push(`"${k}" ${v.op} (${placeholders.join(", ")})`);
                par.push(...arr);
            } else {
                conditions.push(`"${k}" ${v.op} $${index++}`);
                par.push(v.val);
            }
        } else {
            conditions.push(`"${k}" ${defaultOp} $${index++}`);
            par.push(v);
        }
    }

    return conditions.join(` ${sep} `);
}
