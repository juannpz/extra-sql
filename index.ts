//#region CONSTANTS
/** Set of operators in SQL. */
export const OPERATORS: Set<string> = new Set([
  // Arithmetic operators
  '+', '-', '*', '/', '%',
  // Bitwise operators
  '&', '|', '^',
  // Comparison operators
  '=', '>', '<', '>=', '<=', '<>',
  // Compound operators
  '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=',
  // Logical operators
  'ALL', 'AND', 'ANY', 'BETWEEN', 'EXISTS', 'IN', 'LIKE', 'NOT', 'OR', 'SOME'
]);


/**
 * Number of operands used with an SQL operator.
 */
export const OPERAND_COUNT: Map<string, number> = new Map([
  // Arithmetic operators
  ['+', 2], ['-', 2], ['*', 2], ['/', 2], ['%', 2],
  // Bitwise operators
  ['&', 2], ['|', 2], ['^', 2],
  // Comparison operators
  ['=', 2], ['>', 2], ['<', 2], ['>=', 2], ['<=', 2], ['<>', 2],
  // Compound operators
  ['+=', 2], ['-=', 2], ['*=', 2], ['/=', 2], ['%=', 2], ['&=', 2], ['^=', 2], ['|=', 2],
  // Logical operators
  ['ALL', 2], ['AND', 2], ['ANY', 2], ['BETWEEN', 3], ['EXISTS', 1], ['IN', 2], ['LIKE', 2], ['NOT', 1], ['OR', 2], ['SOME', 2]
]);
//#endregion




//#region TYPES
/** Types for columns in a table. */
export type ColumnTypes = {[key: string]: string};

/** Weights for columns in a table (for a tsvector). */
export type ColumnWeights = {[key: string]: string};

/** Data for a row in a table. */
export type RowData = Record<string, unknown>;


/** Options for creating a table. */
export interface CreateTableOptions {
  /** Column name for the primary key. */
  pk?: string;
}


/** Options for creating an index. */
export interface CreateIndexOptions {
  /** Indexing method (e.g., GIN, BTREE). */
  method?: string;
}


/** Options for inserting into a table. */
export interface InsertIntoOptions {
    /** Column name for the primary key. */
    pk?: string;
    /** Add RETURNING clause to the query. */
    returning?: boolean;
}

/** Options for inserting into a table. */
export interface InsertIntoDataOptions {
    /** Add RETURNING clause to the query. */
    returning?: boolean;
}


/** Options for updating data in a table. */
export interface UpdateDataOptions {
    /** Add RETURNING clause to the query. */
    returning?: boolean;
}

/** Options for setting up table indexes. */
export interface SetupTableIndexOptions {
  /** Column name for the primary key. */
  pk?: string;
  /** Whether to create an index. */
  index?: boolean;
  /** Columns, with their weights, for full-text search. */
  tsvector?: ColumnWeights;
}


/** Options for setting up a table. */
export interface SetupTableOptions {
  /** Column name for the primary key. */
  pk?: string;
  /** Whether to create an index. */
  index?: boolean;
  /** Columns, with their weights, for full-text search. */
  tsvector?: ColumnWeights;
}


/** Options for selecting with tsquery. */
export interface SelectTsqueryOptions {
  /** Columns to select. */
  columns?: string;
  /** Whether to order the results. */
  order?: boolean;
  /** Limit the number of results. */
  limit?: number;
  /** Normalization weight used during ranking (in ts_rank). */
  normalization?: number;
}


/** Options for matching with tsquery. */
export interface MatchTsqueryOptions {
  /** Columns to select. */
  columns?: string;
  /** Whether to order the results. */
  order?: boolean;
  /** Limit the number of results. */
  limit?: number;
  /** Normalization weight used during ranking (in ts_rank). */
  normalization?: number;
}


/** Query data with SQL and parameters. */
export interface QueryData {
  /** SQL query string. */
  query: string;
  /** Parameters for the query. */
  data: unknown[];
}
//#endregion

export interface ForeignKeyConstraint<TargetTable = string, TargetColumn = string> {
    table: TargetTable;
    column: TargetColumn;
    onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
}

export interface ColumnConstraints {
    notNull?: boolean;
    default?: ColumnDefaultValue;
    unique?: boolean;
}

export enum ColumnDefaultValue {
    CURRENT_TIMESTAMP = "CURRENT_TIMESTAMP",
    NOW = "NOW()",
    NULL = "NULL",
    TRUE = "TRUE",
    FALSE = "FALSE",
    ZERO = "0",
    EMPTY_STRING = "''",
    EMPTY_JSONB = "'{}'",
    ONE = "1"
}

export interface FunctionConfig<
    TrackColumn extends string = string,
    TableName extends string = string,
    JoinTableName extends string = string,
    JoinColumn extends string = string,
    SourceColumn extends string = string,
    SelectColumns extends string = string
> {
    returnType?: string;
    language?: string;
    trackNewValues?: Partial<Record<TrackColumn, boolean>>;
    trackOldValues?: Partial<Record<TrackColumn, boolean>>;
    joinTables?: Partial<Record<JoinTableName, JoinTableConfig<JoinColumn, SourceColumn, SelectColumns>>>;
    channelName?: string;
    customBody?: string;
    triggers: Record<string, TriggerDefinition<TableName>>;
    functionParams?: Partial<Record<string, FunctionParameter>>;
}

export interface FunctionParameter {
    type: string;
    defaultValue?: string;
}

export interface JoinTableConfig<
    JoinColumn extends string = string,
    SourceColumn extends string = string,
    SelectColumns extends string = string
> {
    joinColumn: JoinColumn;
    sourceColumn: SourceColumn;
    selectColumns: Partial<Record<SelectColumns, boolean>>;
    condition?: string;
}

export interface TriggerDefinition<TableName extends string = string> {
    tableName: TableName;
    timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
    events: Partial<Record<'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE', boolean>>;
    forEach: 'ROW' | 'STATEMENT';
    condition?: string;
}

//#region HELPERS
/**
 * Ensure a value is an array.
 * @param x value to convert to an array
 * @returns array containing the value, or the original array
 */
function asArray<T>(x: unknown): T[] {
  if (Array.isArray(x)) return x;
  if (x==null || typeof x === 'string' || typeof (x as Iterable<T>)[Symbol.iterator] !== 'function') return [x as T];
  return Array.from(x as Iterable<T>);
}


/**
 * Format an object into a string based on a format pattern.
 * @param obj object to format
 * @param fmt format string with placeholders %k, %v, %i
 * @param sep separator between formatted items
 * @param i starting index for %i placeholder [0]
 * @param val array to collect values (optional)
 * @returns formatted string
 */
function formatData(obj: RowData, fmt: string, sep: string, i: number=0, val?: unknown[]): string {
  const a: string[] = [];
  const ve = Array.isArray(val);
  i = i || (ve? val.length : 0);
  for (const k in obj) {
    const v = obj[k];
    a.push(fmt.replace(/%k/g, k).replace(/%v/g, String(v)).replace(/%i/g, String(i++)));
    if (ve) val.push(v);
  }
  return a.join(sep);
}


/**
 * Helper function to add a row to an INSERT INTO SQL command.
 * @param row row object with key-value pairs
 * @param acc string to accumulate to (internal use)
 * @param i current index [0]
 * @returns updated SQL string with the new row added
 */
function addRow(row: RowData, acc: string='', i: number=0): string {
  if (i===0) {
    for (const k in row)
      acc += `"${k}", `;
    acc  = acc.endsWith(', ')? acc.substring(0, acc.length - 2) : acc;
    acc += ') VALUES\n(';
  }
  for (const k in row)
    acc += row[k] == null? 'NULL, ' : `$$${row[k]}$$, `;
  acc  = acc.endsWith(', ')? acc.substring(0, acc.length - 2) : acc;
  acc += '),\n(';
  return acc;
}
//#endregion




/**
 * Generate SQL command for CREATE TABLE.
 * @param name table name
 * @param cols columns `{name: type}`
 * @param opt options `{pk}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL command for creating the table
 * @example
 * ```ts
 * xsql.createTable("plant", {name: "TEXT", type: "TEXT", age: "INT"});
 * // → CREATE TABLE IF NOT EXISTS "plant" ("name" TEXT, "type" TEXT, "age" INT);
 *
 * xsql.createTable("animal", {name: "TEXT", type: "TEXT", age: "INT"}, {pk: "name"});
 * // → CREATE TABLE IF NOT EXISTS "animal" ("name" TEXT, "type" TEXT, "age" INT, PRIMARY KEY("name"));
 * ```
 */
export function createTable(name: string, cols: ColumnTypes, opt: CreateTableOptions={}, acc: string=''): string {
  acc += `CREATE TABLE IF NOT EXISTS "${name}" (`;
  for (const k in cols)
    acc += `"${k}" ${cols[k]}, `;
  if (opt.pk) acc += `PRIMARY KEY("${opt.pk}"), `;
  return acc.replace(/, $/, '') + `);\n`;
}


/**
 * Generate SQL command for CREATE INDEX.
 * @param name index name
 * @param table table name
 * @param expr index expression
 * @param opt options `{method}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL command for creating the index
 * @example
 * ```ts
 * xsql.createIndex("food_code_idx", "food", `"code"`);
 * // → CREATE INDEX IF NOT EXISTS "food_code_idx" ON "food" ("code");
 *
 * xsql.createIndex("food_type_idx", "food", `"type"`, {method: "GIN"});
 * // → CREATE INDEX IF NOT EXISTS "food_type_idx" ON "food" USING GIN ("type");
 * ```
 */
export function createIndex(name: string, table: string, expr: string, opt: CreateIndexOptions={}, acc: string=''): string {
  acc += `CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" `;
  if (opt.method) acc += `USING ${opt.method} `;
  return acc + `(${expr});\n`;
}


/**
 * Generate SQL command for CREATE VIEW.
 * @param name view name
 * @param query view query
 * @param opt options (currently unused)
 * @param acc string to accumulate to (internal use)
 * @returns SQL command for creating the view
 * @example
 * ```ts
 * xsql.createView("food_code", "SELECT \"code\" FROM \"food\"");
 * // → CREATE OR REPLACE VIEW "food_code" AS SELECT "code" FROM "food";
 * ```
 */
export function createView(name: string, query: string, _opt: object | null=null, acc: string=''): string {
  acc += `CREATE OR REPLACE VIEW "${name}" AS ${query};\n`;
  return acc;
}


/**
 * Generates SQL command for INSERT INTO using an array of values.
 * @param table table name
 * @param rows row objects `{column: value}`
 * @param opt options `{pk, returning}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL command to insert into the table
 * @example
 * ```ts
 * xsql.insertInto("food", [{code: "F1", name: "Mango"}], {returning: true});
 * // → INSERT INTO "food" ("code", "name") VALUES\n($$F1$$, $$Mango$$) RETURNING *;
 * ```
 */
export function insertInto(table: string, rows: Iterable<RowData>, opt: InsertIntoOptions = {}, acc: string = ''): string {
    let i = -1;
    acc += `INSERT INTO "${table}" (`;
    for (const val of rows)
        acc = addRow(val, acc, ++i);
    acc = acc.replace(/\),\n\($/, '') + ')';
    if (opt.pk) acc += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
    if (opt.returning) acc += ' RETURNING *';
    return acc + ';\n';
}


/**
 * Generate a tsvector expression for full-text search.
 * @param cols columns with their weights `{name: weight}`
 * @returns tsvector expression
 */
function tsvector(cols: ColumnWeights): string {
  let acc = '';
  for (const k in cols) {
    if (cols[k]) acc += `setweight(to_tsvector('english', "${k}"), '${cols[k]}')||`;
  }
  return acc.replace(/\|\|$/, '');
}


/**
 * Generate SQL commands for setting up table indexes and views.
 * @param table table name
 * @param cols columns with their types `{name: type}`
 * @param opt options `{pk, index, tsvector}`
 * @param acc Accumulator for the SQL string (internal use).
 * @returns SQL commands for setting up the table indexes and views
 */
export function setupTableIndex(table: string, cols: ColumnTypes, opt: SetupTableIndexOptions={}, acc: string=''): string {
  if (opt.tsvector) {
    const tv = tsvector(opt.tsvector);
    acc += createView(table + '_tsvector', `SELECT *, ${tv} AS "tsvector" FROM "${table}"`);
    if (opt.index) acc += createIndex(table + '_tsvector_idx', table, `(${tv})`, { method: 'GIN' });
  }
  if (opt.index) {
    for (const k in cols) {
      if (cols[k] == null || k === opt.pk) continue;
      const knam = k.replace(/\W+/g, '_').toLowerCase();
      acc += createIndex(`${table}_${knam}_idx`, table, `"${k}"`);
    }
  }
  return acc;
}


/**
 * Generate SQL commands to set up a table (create, insert, index).
 * @param name table name
 * @param cols columns with their types `{name: type}`
 * @param rows rows to insert (optional)
 * @param opt options `{pk, index, tsvector}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL commands for setting up the table
 * @example
 * ```ts
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"});
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
 *
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"},
 *   [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}]);
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
 * // → INSERT INTO "food" ("code", "name") VALUES
 * // → ('F1', 'Mango'),
 * // → ('F2', 'Lychee');
 *
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"},
 *   [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}],
 *   {index: true});
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
 * // → INSERT INTO "food" ("code", "name") VALUES
 * // → ('F1', 'Mango'),
 * // → ('F2', 'Lychee');
 * // → CREATE INDEX IF NOT EXISTS food_code_idx ON "food" ("code");
 * // → CREATE INDEX IF NOT EXISTS food_name_idx ON "food" ("name");
 *
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"},
 *   [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}],
 *   {pk: "code", index: true, tsvector: {code: "A", name: "B"}});
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT, PRIMARY KEY("code"));
 * // → INSERT INTO "food" ("code", "name") VALUES
 * // → ('F1', 'Mango'),
 * // → ('F2', 'Lychee');
 * // → ON CONFLICT ("code") DO NOTHING;
 * // → CREATE OR REPLACE VIEW "food_tsvector" AS SELECT *, setweight(to_tsvector('english', "code"), 'A')||setweight(to_tsvector('english', "name"), 'B') AS "tsvector" FROM "food";
 * // → CREATE INDEX IF NOT EXISTS "food_tsvector_idx" ON "food" USING GIN ((setweight(to_tsvector('english', "code"), 'A')||setweight(to_tsvector('english', "name"), 'B')));
 * // → CREATE INDEX IF NOT EXISTS "food_name_idx" ON "food" ("name");
 * ```
 */
export function setupTable(name: string, cols: ColumnTypes, rows: Iterable<RowData> | null=null, opt: SetupTableOptions={}, acc: string=''): string {
  acc = createTable(name, cols, opt, acc);
  if (rows) acc = insertInto(name, rows, opt, acc);
  return setupTableIndex(name, cols, opt, acc);
}


/**
 * Generate SQL command to check if a table exists.
 * @param name table name
 * @returns SQL command to check if the table exists
 * @example
 * ```ts
 * xsql.tableExists("food");
 * // → SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');
 * ```
 */
export function tableExists(name: string): string {
  return `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${name}');\n`;
}


/**
 * Generate SQL command for SELECT with tsquery.
 * @param table table name
 * @param query plain query words
 * @param tsv tsvector column name ["tsvector"]
 * @param opt options `{columns, order, limit, normalization}`
 * @returns SQL command for selecting with tsquery
 * @example
 * ```ts
 * xsql.selectTsquery("columns", "total fat");
 * // → SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');
 *
 * xsql.selectTsquery("columns", "total fat", '"tsvector"', {columns: '"code"'});
 * // → SELECT "code" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');
 *
 * xsql.selectTsquery("columns", "total fat", '"tsvector"', {order: true, limit: 1, normalization: 2});
 * // → SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') ORDER BY ts_rank("tsvector", plainto_tsquery('total fat'), 2) DESC LIMIT 1;
 * ```
 */
export function selectTsquery(table: string, query: string, tsv: string='"tsvector"', opt: SelectTsqueryOptions={}): string {
  const col = opt.columns || '*';
  const nrm = opt.normalization || 0;
  let acc = `SELECT ${col} FROM "${table}" WHERE ${tsv} @@ plainto_tsquery('${query}')`;
  if (opt.order) acc += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${query}'), ${nrm}) DESC`;
  if (opt.limit) acc += ` LIMIT ${opt.limit}`;
  acc += `;\n`;
  return acc;
}


/**
 * Generate SQL query for matching words with tsquery.
 * @param table table name
 * @param words match words
 * @param tsv tsvector column name ["tsvector"]
 * @param opt options `{columns, order, limit, normalization}`
 * @returns SQL query for matching words with tsquery
 * @example
 * ```ts
 * xsql.matchTsquery("columns", ["total", "fat"]);
 * // → SELECT *, '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') UNION ALL
 * // → SELECT *, '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total');
 *
 * xsql.matchTsquery("columns", ["total", "fat"], '"tsvector"', {columns: '"code"'});
 * // → SELECT "code", '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') UNION ALL
 * // → SELECT "code", '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total');
 *
 * xsql.matchTsquery("columns", ["total", "fat"], '"tsvector"', {order: true, limit: 1, normalization: 2});
 * // → SELECT *, '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') ORDER BY ts_rank("tsvector", plainto_tsquery('total fat'), 2) DESC UNION ALL
 * // → SELECT *, '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total') ORDER BY ts_rank("tsvector", plainto_tsquery('total'), 2) DESC LIMIT 1;
 * ```
 */
export function matchTsquery(table: string, words: string[], tsv: string='"tsvector"', opt: MatchTsqueryOptions={}): string {
  const col = opt.columns || '*';
  const nrm = opt.normalization || 0;
  let acc = '';
  for (let i=words.length; i>0; i--) {
    const qry = words.slice(0, i).join(' ').replace(/([\'\"])/g, '$1$1');
    acc += `SELECT ${col}, '${i}'::INT AS "matchTsquery" FROM "${table}"`;
    acc += ` WHERE ${tsv} @@ plainto_tsquery('${qry}')`;
    if (opt.order) acc += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${qry}'), ${nrm}) DESC`;
    acc += ' UNION ALL\n';
  }
  acc = acc.substring(0, acc.length - 11);
  if (opt.limit) acc += ` LIMIT ${opt.limit}`;
  acc += ';\n';
  return acc;
}


/**
 * Generate SQL command for creating a table with data.
 * @param table table name
 * @param cols columns with their types `{name: type}`
 * @param pkeys primary key(s)
 * @returns query data for creating the table `{query, data}`
 */
export function createTableData(table: string, cols: ColumnTypes, pkeys?: string | Iterable<string>): QueryData {
  return {
    query: `CREATE TABLE IF NOT EXISTS "${table}" (` +
      `${formatData(cols, '"%k" %v', ', ')}` +
      (pkeys? `, PRIMARY KEY(${formatData(asArray(pkeys) as unknown as RowData, '"%v"', ', ')})` : ``) + `);`,
    data: []
  };
}


/**
 * Generates SQL command for updating data.
 * @param table table name
 * @param set columns to set `{column: value}`
 * @param where where conditions `{column: value}`
 * @param op operator for conditions ['=']
 * @param sep separator for conditions ['AND']
 * @param returning add RETURNING clause to the query [false]
 * @returns query data for updating the data `{query, data}`
 * @example
 * ```ts
 * xsql.updateData("users", {name: "Alice"}, {id: 1}, "=", "AND", true);
 * // → { query: 'UPDATE "users" SET "name" = $1 WHERE "id" = $2 RETURNING *;', data: ["Alice", 1] }
 * ```
 */
export function updateData(
    table: string,
    set: RowData,
    where: RowData,
    op: string = '=',
    sep: string = 'AND',
    opt: UpdateDataOptions = {}
): QueryData {
    const par: unknown[] = [];
    const setStr = formatData(set || {}, '"%k" = $%i', ', ', 1, par);
    const exp = formatData(where || {}, `"%k" ${op} $%i`, ` ${sep} `, par.length + 1, par);
    const returningClause = opt.returning ? ' RETURNING *' : '';
    return {
        query: `UPDATE "${table}" SET ${setStr}${exp ? ' WHERE ' + exp : ''}${returningClause};`,
        data: par
    };
}


/**
 * Generate SQL command for selecting data.
 * @param tab table name
 * @param whr where conditions `{column: value}`
 * @param op operator for conditions ['=']
 * @param sep separator for conditions ['AND']
 * @returns query data for selecting the data `{query, data}`
 */
export function selectData(tab: string, whr: RowData, op: string='=', sep: string='AND'): QueryData {
  const par: unknown[] = [];
  const exp = formatData(whr || {}, `"%k" ${op} $%i`, ` ${sep} `, 1, par);
  return {
    query: `SELECT * FROM "${tab}"${exp ? ' WHERE ' + exp : ''};`,
    data: par
  };
}


/**
 * Generates SQL command for inserting data.
 * @param table table name
 * @param rows rows to insert
 * @param returning add RETURNING clause to the query [false]
 * @returns query data for inserting the data `{query, data}`
 * @example
 * ```ts
 * xsql.insertIntoData("users", [{name: "Bob", age: 30}], true);
 * // → { query: 'INSERT INTO "users" ("name", "age") VALUES ($1, $2) RETURNING *;', data: ["Bob", 30] }
 * ```
 */
export function insertIntoData(table: string, rows: RowData[], opt: InsertIntoDataOptions = {}): QueryData {
    const par: unknown[] = [];
    const into = formatData(rows[0] || {}, '"%k"', ', ', 1, par);
    const rowsStr = formatData(par as unknown as RowData, '$%i', ', ', 1);
    const returningClause = opt.returning ? ' RETURNING *' : '';
    return {
        query: `INSERT INTO "${table}" (${into}) VALUES (${rowsStr})${returningClause};`,
        data: par
    };
}


/**
 * Generate SQL command for deleting data.
 * @param table table name
 * @param where where conditions `{column: value}`
 * @param op operator for conditions ['=']
 * @param sep separator for conditions ['AND']
 * @returns query data for deleting the data `{query, data}`
 */
export function deleteData(table: string, where: RowData, op: string='=', sep: string='AND'): QueryData {
  const par: unknown[] = [];
  const exp = formatData(where || {}, `"%k" ${op} $%i`, ` ${sep} `, 1, par);
  return {
    query: `DELETE FROM "${table}"${exp ? ' WHERE ' + exp : ''};`,
    data: par
  };
}

/**
 * Converts nested objects within an iterable collection to JSON strings.
 * This function takes any iterable collection of objects and transforms any
 * nested object (that is not an Array or Date) into its JSON string representation.
 * 
 * @param data - An iterable collection of objects that may contain nested objects
 * @returns An array of objects with nested objects converted to JSON strings
 * 
 * @example
 * // Converts the nested 'metadata' object to a JSON string
 * stringifyObjectsInIterable([
 *   { id: 1, metadata: { name: "test" } }
 * ]); 
 * // Returns [{ id: 1, metadata: '{"name":"test"}' }]
 */
export function stringifyObjectsInIterable(data: Iterable<Record<string, unknown>>): Record<string, unknown>[] {
    const items = Array.isArray(data) ? data : Array.from(data);

    return items.map(item => {
        const stringifiedItem: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(item)) {
            const isObject = value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

            if (isObject)
                stringifiedItem[key] = JSON.stringify(value);
            else
                stringifiedItem[key] = value;
        }

        return stringifiedItem;
    });
}

/**
 * Removes null or undefined properties from an iterable collection of objects.
 * This function processes each object in the collection and removes any property
 * whose value is null or undefined, generating new clean objects.
 * 
 * @param data - An iterable collection of objects that may contain null or undefined properties
 * @returns An array of objects without null or undefined properties
 * 
 * @example
 * // Removes the 'optional' property which is undefined
 * removeNullAndUndefinedFromIterable([
 *   { id: 1, name: "test", optional: undefined }
 * ]); 
 * // Returns [{ id: 1, name: "test" }]
 */
export function removeNullAndUndefinedFromIterable(data: Iterable<Record<string, unknown>>): Record<string, unknown>[] {
    const items = Array.isArray(data) ? data : Array.from(data);

    return items.map(item => {
        const cleanItem: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(item)) {
            if (value !== null && value !== undefined)
                cleanItem[key] = value;
        }

        return cleanItem;
    });
}

/**
 * Converts nested objects within an object to JSON strings.
 * This function examines each property of the object and transforms any
 * nested object (that is not an Array or Date) into its JSON string representation.
 * 
 * @param data - An object that may contain nested objects
 * @returns An object with nested objects converted to JSON strings
 * 
 * @example
 * // Converts the nested 'config' object to a JSON string
 * stringifyObjectsInObject({
 *   id: 1,
 *   config: { theme: "dark", notifications: true }
 * }); 
 * // Returns { id: 1, config: '{"theme":"dark","notifications":true}' }
 */
export function stringifyObjectsInObject(data: Record<string, unknown>): Record<string, unknown> {
    const stringifiedObject: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
        const isObject = value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

        if (isObject)
            stringifiedObject[key] = JSON.stringify(value);
        else
            stringifiedObject[key] = value;
    }

    return stringifiedObject;
}

/**
 * Removes null or undefined properties from an object.
 * This function processes the object and removes any property
 * whose value is null or undefined, generating a new clean object.
 * 
 * @param data - An object that may contain null or undefined properties
 * @returns An object without null or undefined properties
 * 
 * @example
 * // Removes the 'description' property which is null
 * removeNullAndUndefinedFromObject({
 *   id: 1,
 *   name: "test",
 *   description: null
 * }); 
 * // Returns { id: 1, name: "test" }
 */
export function removeNullAndUndefinedFromObject(data: Record<string, unknown>): Record<string, unknown> {
    const cleanObject: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined)
            cleanObject[key] = value;
    }

    return cleanObject;
}

/**
 * Applies column constraints and foreign key relationships to a SQL CREATE TABLE query.
 * This function enhances a basic CREATE TABLE query by adding NOT NULL, DEFAULT, UNIQUE constraints,
 * and foreign key relationships. It supports TypeScript generics for type-safe constraint definition.
 * 
 * @param query - The original CREATE TABLE SQL query string
 * @param constraints - A partial record mapping column names to their constraints (NOT NULL, DEFAULT, UNIQUE)
 * @param foreignKeys - Optional partial record mapping column names to their foreign key relationships
 * @returns A modified SQL query string with all constraints applied
 * 
 * @example
 * // Adds NOT NULL, DEFAULT constraints and a foreign key relationship
 * applyColumnConstraints(
 *   'CREATE TABLE "user_credentials" ("identity_id" SERIAL, "user_id" INTEGER)',
 *   {
 *     user_id: { notNull: true, unique: true }
 *   },
 *   {
 *     user_id: {
 *       table: 'users',
 *       column: 'user_id',
 *       onDelete: 'CASCADE',
 *       onUpdate: 'CASCADE'
 *     }
 *   }
 * );
 * // Returns a SQL query with NOT NULL, UNIQUE constraints and foreign key definition
 */
export function applyColumnConstraints<
    SourceColumn extends string = string,
    TargetTable extends string = string,
    TargetColumn extends string = string
>(
    query: string,
    constraints: Partial<Record<SourceColumn, ColumnConstraints>>,
    foreignKeys?: Partial<Record<SourceColumn, ForeignKeyConstraint<TargetTable, TargetColumn>>>
): string {
    let modifiedQuery = query;

    for (const [columnName, columnConstraints] of Object.entries(constraints) as [SourceColumn, ColumnConstraints][]) {
        const pattern = new RegExp(`"${columnName}"\\s+([^,)]+?)(?=,|\\)|$)`);

        modifiedQuery = modifiedQuery.replace(pattern, (match) => {
            let result = match.trim();

            if (columnConstraints.notNull && !result.includes('NOT NULL'))
                result += ' NOT NULL';

            if (columnConstraints.default && !result.includes('DEFAULT'))
                result += ` DEFAULT ${columnConstraints.default}`;

            if (columnConstraints.unique && !result.includes('UNIQUE'))
                result += ' UNIQUE';

            return result;
        });
    }

    if (foreignKeys && Object.keys(foreignKeys).length > 0) {
        const lastParenIndex = modifiedQuery.lastIndexOf(')');

        if (lastParenIndex !== -1) {
            const foreignKeysConstraints = (Object.entries(foreignKeys) as [SourceColumn, ForeignKeyConstraint<TargetTable, TargetColumn>][])
                .map(([columnName, fkInfo]) => {
                    let constraint = `,\n  CONSTRAINT "fk_${columnName}" FOREIGN KEY ("${columnName}") `;
                    constraint += `REFERENCES ${fkInfo.table}("${fkInfo.column}")`;

                    if (fkInfo.onDelete)
                        constraint += ` ON DELETE ${fkInfo.onDelete}`;

                    if (fkInfo.onUpdate)
                        constraint += ` ON UPDATE ${fkInfo.onUpdate}`;

                    return constraint;
                }).join('');

            modifiedQuery = modifiedQuery.slice(0, lastParenIndex) + foreignKeysConstraints + modifiedQuery.slice(lastParenIndex);
        }
    }

    return modifiedQuery;
}


/**
 * Generates SQL commands to create functions and triggers in PostgreSQL with advanced configuration options.
 * This function allows defining PostgreSQL functions and associating them with triggers
 * on specific tables with highly configurable parameters including column selection and cross-table references.
 * 
 * @param functionName - Name of the function to create
 * @param config - Configuration object for the function and triggers
 * @returns SQL commands to create the function and its associated triggers
 * 
 * @example
 * // Creates a notification function that tracks changes in specific columns
 * createFunctionAndTrigger(
 *   'notify_user_change',
 *   {
 *     returnType: 'TRIGGER',
 *     language: 'plpgsql',
 *     trackNewValues: {
 *       name: true,
 *       email: true,
 *       role: true
 *     },
 *     trackOldValues: {
 *       role: true
 *     },
 *     joinTables: {
 *       user_profiles: {
 *         joinColumn: 'user_id',
 *         sourceColumn: 'id',
 *         selectColumns: {
 *           avatar_url: true,
 *           bio: true
 *         },
 *         condition: "active = true"
 *       }
 *     },
 *     channelName: 'user_changes',
 *     triggers: {
 *       user_change_trigger: {
 *         tableName: 'users',
 *         timing: 'AFTER',
 *         events: {
 *           UPDATE: true,
 *           INSERT: true
 *         },
 *         forEach: 'ROW',
 *         condition: "NEW.role <> 'guest'"
 *       }
 *     },
 *     functionParams: {
 *       include_metadata: {
 *         type: 'BOOLEAN',
 *         defaultValue: 'TRUE'
 *       }
 *     }
 *   }
 * );
 */
export function createFunctionAndTrigger<
    TrackColumn extends string = string,
    TableName extends string = string,
    JoinTableName extends string = string,
    JoinColumn extends string = string,
    SourceColumn extends string = string,
    SelectColumns extends string = string
>(
    functionName: string,
    config: FunctionConfig<TrackColumn, TableName, JoinTableName, JoinColumn, SourceColumn, SelectColumns>
): string {
    // Create the function definition
    let sql = `CREATE OR REPLACE FUNCTION ${functionName}(`;

    // Add parameters if they exist
    if (config.functionParams && Object.keys(config.functionParams).length > 0) {
        sql += Object.entries(config.functionParams).map(([paramName, paramConfig]) => {
            // Verificar que paramConfig no sea undefined
            if (!paramConfig) return '';

            let paramDef = `${paramName} ${paramConfig.type}`;
            if (paramConfig.defaultValue !== undefined) {
                paramDef += ` DEFAULT ${paramConfig.defaultValue}`;
            }
            return paramDef;
        }).filter(Boolean).join(', ');
    }

    sql += `) RETURNS ${config.returnType || 'TRIGGER'} AS $$\n`;

    // Determine if this is a trigger function (either explicitly specified or by default)
    const isTriggerFunction = config.returnType === undefined || config.returnType === 'TRIGGER';

    // If custom body is provided, use it
    if (config.customBody) {
        sql += config.customBody;
    } else {
        // Generate function body based on configuration
        let functionBody = '';

        // Get tracked columns as arrays for convenience
        const trackNewColumns = config.trackNewValues ? Object.keys(config.trackNewValues).filter(key => config.trackNewValues![key as TrackColumn]) : [];
        const trackOldColumns = config.trackOldValues ? Object.keys(config.trackOldValues).filter(key => config.trackOldValues![key as TrackColumn]) : [];
        const joinTableNames = config.joinTables ? Object.keys(config.joinTables) : [];

        // Declare section for variables if needed
        const needsDeclare = joinTableNames.length > 0 || trackNewColumns.length > 0 || trackOldColumns.length > 0;

        if (needsDeclare) {
            functionBody += "DECLARE\n  payload JSONB;\n";

            // Add variables for join results
            if (joinTableNames.length > 0) {
                joinTableNames.forEach(tableName => {
                    functionBody += `  ${tableName}_data JSONB;\n`;
                });
            }

            functionBody += "BEGIN\n";

            // Initialize the payload
            functionBody += "  -- Initialize the payload\n";
            functionBody += "  payload = jsonb_build_object(\n";
            functionBody += "    'table', TG_TABLE_NAME,\n";
            functionBody += "    'action', TG_OP";

            // Add new values tracking
            if (trackNewColumns.length > 0) {
                functionBody += ",\n    'new_values', jsonb_build_object(\n";

                // Add each tracked column
                functionBody += trackNewColumns.map(col =>
                    `      '${col}', NEW.${col}`
                ).join(',\n');

                functionBody += "\n    )";
            }

            functionBody += "\n  );\n\n";

            // Add old values tracking for UPDATE operations
            if (trackOldColumns.length > 0) {
                functionBody += "  -- Add old values for UPDATE operations\n";
                functionBody += "  IF TG_OP = 'UPDATE' THEN\n";
                functionBody += "    payload = payload || jsonb_build_object(\n";
                functionBody += "      'old_values', jsonb_build_object(\n";

                // Add each tracked old column
                functionBody += trackOldColumns.map(col =>
                    `        '${col}', OLD.${col}`
                ).join(',\n');

                functionBody += "\n      )\n";
                functionBody += "    );\n";
                functionBody += "  END IF;\n\n";
            }

            // Process joins
            if (joinTableNames.length > 0 && config.joinTables) {
                joinTableNames.forEach(tableName => {
                    const join = config.joinTables?.[tableName as JoinTableName];

                    // Verificar que join no sea undefined
                    if (!join) return;

                    const selectColumnNames = Object.keys(join.selectColumns)
                        .filter(key => join.selectColumns[key as SelectColumns]);

                    functionBody += `  -- Join with ${tableName} table\n`;
                    functionBody += `  SELECT jsonb_build_object(\n`;

                    // Add each selected column
                    functionBody += selectColumnNames.map(col =>
                        `    '${col}', ${col}`
                    ).join(',\n');

                    functionBody += `\n  ) INTO ${tableName}_data\n`;
                    functionBody += `  FROM ${tableName}\n`;
                    functionBody += `  WHERE ${join.joinColumn} = NEW.${join.sourceColumn}`;

                    if (join.condition) {
                        functionBody += ` AND ${join.condition}`;
                    }

                    functionBody += `;\n\n`;

                    // Add joined data to payload
                    functionBody += `  -- Add joined data to payload\n`;
                    functionBody += `  payload = payload || jsonb_build_object('${tableName}', ${tableName}_data);\n\n`;
                });
            }

            // Add notification if channel is specified
            if (config.channelName) {
                functionBody += `  -- Send notification\n`;
                functionBody += `  PERFORM pg_notify('${config.channelName}', payload::text);\n\n`;
            }

            // Always add an appropriate RETURN statement for trigger functions
            if (isTriggerFunction) {
                functionBody += "  -- Return for trigger function\n";
                functionBody += "  RETURN NEW;\n";
            } else {
                // For non-trigger functions, add a generic RETURN
                functionBody += "  -- Return for non-trigger function\n";
                functionBody += "  RETURN;\n";
            }

            functionBody += "END;";
        } else {
            // Simple body without declarations
            functionBody = "BEGIN\n";

            // Add notification to empty function if channel is specified
            if (config.channelName) {
                if (isTriggerFunction) {
                    functionBody += `  PERFORM pg_notify('${config.channelName}', row_to_json(NEW)::text);\n\n`;
                } else {
                    functionBody += `  PERFORM pg_notify('${config.channelName}', '{}'::text);\n\n`;
                }
            }

            // Always add appropriate RETURN statement
            if (isTriggerFunction) {
                functionBody += "  -- Return for trigger function\n";
                functionBody += "  RETURN NEW;\n";
            } else {
                functionBody += "  -- Return for non-trigger function\n";
                functionBody += "  RETURN;\n";
            }

            functionBody += "END;";
        }

        sql += functionBody;
    }

    // Close function definition
    sql += `\n$$ LANGUAGE ${config.language || 'plpgsql'};\n`;

    // Create the associated triggers
    if (config.triggers) {
        for (const [triggerName, trigger] of Object.entries(config.triggers)) {
            sql += `\nCREATE OR REPLACE TRIGGER ${triggerName}\n`;
            sql += `${trigger.timing} `;

            // Process events
            const events = Object.entries(trigger.events)
                .filter(([_, isEnabled]) => isEnabled)
                .map(([eventName, _]) => eventName);

            sql += `${events.join(' OR ')} ON "${trigger.tableName}"\n`;
            sql += `FOR EACH ${trigger.forEach}\n`;

            if (trigger.condition) {
                sql += `WHEN (${trigger.condition})\n`;
            }

            sql += `EXECUTE FUNCTION ${functionName}();\n`;
        }
    }

    return sql;
}


// /**
//  * Convert Linux wildcard patterns to SQL LIKE patterns.
//  * @param txt pattern to convert
//  * @returns converted pattern, or null if input is null
//  */
// function fromLinuxWildcard(txt: string | null): string | null {
//   return txt ? txt.replace(/\*/g, '%').replace(/\?/g, '_') : txt;
// }


// /**
//  * Generate SQL command for INSERT INTO using a stream of values.
//  * @param table table name
//  * @param stream readable stream of row objects `{column: value}`
//  * @param opt options `{pk}`
//  * @param acc string to accumulate to (internal use)
//  * @returns SQL command to insert into the table (promise)
//  */
// export function insertIntoStream(table: string, stream: Readable, opt: InsertIntoOptions={}, acc: string=''): Promise<string> {
//   let i = -1;
//   acc += `INSERT INTO "${table}" (`;
//   return new Promise((resolve, reject) => {
//     stream.on('error', reject);
//     stream.on('data', (row: RowData) => {
//       acc = addRow(row, acc, ++i);
//     });
//     stream.on('end', () => {
//       acc = acc.replace(/\),\n\($/, '') + ')';
//       if (opt.pk) acc += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
//       resolve(acc + ';\n');
//     });
//   });
// }
