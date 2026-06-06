import type { MatchTsqueryOptions, SelectTsqueryOptions } from "./types.ts";

/**
 * Generates a `SELECT` query using PostgreSQL full-text search
 * (`plainto_tsquery`).
 *
 * Searches a `tsvector` column for rows matching the plain query words.
 * Optionally orders by `ts_rank` and limits results.
 *
 * @param table - Table name.
 * @param query - Plain query words (e.g. `"total fat"`).
 * @param tsv - Name of the tsvector column (default `'"tsvector"'`).
 * @param opt - Options: `columns`, `order`, `limit`, `normalization`.
 * @returns SQL SELECT statement terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.selectTsquery("columns", "total fat");
 * // SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');
 *
 * xsql.selectTsquery("columns", "total fat", '"tsvector"', {
 *   columns: '"code"',
 *   order: true,
 *   limit: 10,
 *   normalization: 2,
 * });
 * // SELECT "code" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat')
 * // ORDER BY ts_rank("tsvector", plainto_tsquery('total fat'), 2) DESC LIMIT 10;
 * ```
 */
export function selectTsquery(
    table: string,
    query: string,
    tsv: string = '"tsvector"',
    opt: SelectTsqueryOptions = {},
): string {
    const col = opt.columns || "*";
    const nrm = opt.normalization || 0;
    let acc = `SELECT ${col} FROM "${table}" WHERE ${tsv} @@ plainto_tsquery('${query}')`;
    if (opt.order) {
        acc += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${query}'), ${nrm}) DESC`;
    }
    if (opt.limit) acc += ` LIMIT ${opt.limit}`;
    acc += `;\n`;
    return acc;
}

/**
 * Generates a multi-term tsquery matching query using `UNION ALL`.
 *
 * For a given array of words `["total", "fat"]`, generates UNION ALL
 * subqueries where each successively shorter prefix of the word list
 * is used as the tsquery term. A literal integer rank column
 * (`"matchTsquery"`) is added to indicate how many terms matched.
 *
 * @param table - Table name.
 * @param words - Array of search terms.
 * @param tsv - Name of the tsvector column (default `'"tsvector"'`).
 * @param opt - Options: `columns`, `order`, `limit`, `normalization`.
 * @returns SQL UNION ALL query terminated with `;\n`.
 *
 * @example
 * ```ts
 * xsql.matchTsquery("columns", ["total", "fat"]);
 * // SELECT *, '2'::INT AS "matchTsquery" FROM "columns"
 * //   WHERE "tsvector" @@ plainto_tsquery('total fat')
 * // UNION ALL
 * // SELECT *, '1'::INT AS "matchTsquery" FROM "columns"
 * //   WHERE "tsvector" @@ plainto_tsquery('total');
 * ```
 */
export function matchTsquery(
    table: string,
    words: string[],
    tsv: string = '"tsvector"',
    opt: MatchTsqueryOptions = {},
): string {
    const col = opt.columns || "*";
    const nrm = opt.normalization || 0;
    let acc = "";
    for (let i = words.length; i > 0; i--) {
        const qry = words.slice(0, i).join(" ").replace(/([\'\"])/g, "$1$1");
        acc += `SELECT ${col}, '${i}'::INT AS "matchTsquery" FROM "${table}"`;
        acc += ` WHERE ${tsv} @@ plainto_tsquery('${qry}')`;
        if (opt.order) {
            acc += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${qry}'), ${nrm}) DESC`;
        }
        acc += " UNION ALL\n";
    }
    acc = acc.substring(0, acc.length - 11);
    if (opt.limit) acc += ` LIMIT ${opt.limit}`;
    acc += ";\n";
    return acc;
}
