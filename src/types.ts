//#region Core Types

import type { ColumnDefaultValue } from "./constants.ts";

/**
 * Mapping of column names to their PostgreSQL data types.
 *
 * @example
 * ```ts
 * const cols: ColumnTypes = { id: "SERIAL", name: "TEXT", age: "INT" };
 * ```
 */
export type ColumnTypes = Record<string, string>;

/**
 * Mapping of column names to tsvector weight letters (`A`, `B`, `C`, `D`).
 *
 * Used as configuration for full-text search index generation
 * in {@link SetupTableIndexOptions.tsvector}.
 *
 * @example
 * ```ts
 * const weights: ColumnWeights = { title: "A", content: "B" };
 * ```
 */
export type ColumnWeights = Record<string, string>;

/**
 * Generic row of data represented as a string-keyed record.
 *
 * Used throughout the library to represent table rows for
 * INSERT, UPDATE, and WHERE clauses.
 */
export type RowData = Record<string, unknown>;

/**
 * The return type for all parameterized SQL generation functions.
 *
 * Contains the SQL query string with `$1`, `$2`, ... placeholders
 * and the corresponding array of parameter values in order.
 *
 * @example
 * ```ts
 * const result: QueryData = selectData("users", { id: 1 });
 * // result.query → 'SELECT * FROM "users" WHERE "id" = $1;'
 * // result.data  → [1]
 * ```
 */
export interface QueryData {
    /** SQL query string with `$1, $2` placeholders. */
    query: string;
    /** Parameter values in the order they appear as placeholders. */
    data: unknown[];
}

/**
 * Represents a specialized WHERE clause condition for cases where
 * the default `=` operator is insufficient.
 *
 * Supports operators like `IN`, `>`, `<`, `LIKE`, `NOT`, `BETWEEN`, etc.
 * When `op` is `"IN"` and `val` is an array, the array is expanded
 * into individual placeholders: `"col" IN ($1, $2, $3)`.
 *
 * @example
 * ```ts
 * const condition: QueryCondition = { op: "IN", val: [1, 2, 3] };
 * const condition2: QueryCondition = { op: ">=", val: 18 };
 * ```
 */
export interface QueryCondition {
    /** SQL operator (e.g. `"IN"`, `">"`, `"LIKE"`, `"NOT"`). */
    op: string;
    /** Value or array of values for the operator. */
    val: unknown;
}

//#endregion

//#region DDL Option Types

/**
 * Options for {@link createTable}.
 */
export interface CreateTableOptions {
    /** Column name for the primary key. */
    pk?: string;
}

/**
 * Options for {@link createIndex}.
 */
export interface CreateIndexOptions {
    /**
     * Indexing method.
     *
     * Common values: `"BTREE"` (default), `"GIN"`, `"GiST"`, `"HASH"`.
     */
    method?: string;
}

/**
 * Options for {@link setupTableIndex}.
 */
export interface SetupTableIndexOptions {
    /** Column name for the primary key (excluded from automatic indexing). */
    pk?: string;
    /** Whether to create automatic indexes on non-PK columns. */
    index?: boolean;
    /**
     * Column weight configuration for full-text search.
     *
     * When provided, generates a tsvector view and (if `index` is enabled)
     * a GIN index over the weighted tsvector expression.
     */
    tsvector?: ColumnWeights;
}

/**
 * Options for {@link setupTable}.
 */
export interface SetupTableOptions {
    /** Column name for the primary key. */
    pk?: string;
    /** Whether to create automatic indexes on non-PK columns. */
    index?: boolean;
    /** Column weight configuration for full-text search. */
    tsvector?: ColumnWeights;
}

//#endregion

//#region DML Option Types

/**
 * Options for {@link insertInto} (raw SQL style with `$$...$$` values).
 */
export interface InsertIntoOptions {
    /** Column name for the primary key, used for `ON CONFLICT DO NOTHING`. */
    pk?: string;
    /** Append `RETURNING *` to the query. */
    returning?: boolean;
}

/**
 * Options for {@link insertIntoData} (parameterized style with `$N` placeholders).
 */
export interface InsertIntoDataOptions {
    /** Append `RETURNING *` to the query. */
    returning?: boolean;
}

/**
 * Options for {@link updateData}.
 */
export interface UpdateDataOptions {
    /** Append `RETURNING *` to the query. */
    returning?: boolean;
}

/**
 * Options for {@link selectData}.
 */
export interface SelectDataOptions {
    /**
     * Columns to select.
     *
     * @default "*"
     */
    columns?: string;
    /** Maximum number of rows to return. */
    limit?: number;
    /** Number of rows to skip before returning results. */
    offset?: number;
    /** Column name to order results by. */
    orderBy?: string;
    /**
     * Sort direction.
     *
     * @default "ASC"
     */
    orderDirection?: "ASC" | "DESC";
}

//#endregion

//#region Full-Text Search Option Types

/**
 * Options for {@link selectTsquery}.
 */
export interface SelectTsqueryOptions {
    /** Columns to select (defaults to `*`). */
    columns?: string;
    /** Whether to order results by `ts_rank` descending. */
    order?: boolean;
    /** Maximum number of results. */
    limit?: number;
    /**
     * Normalization weight passed to `ts_rank`.
     *
     * Common values:
     * - `0` – default behavior
     * - `1` – divides rank by 1 + log(len)
     * - `2` – divides rank by document length
     * - `4` – divides rank by mean harmonic distance
     * - `8` – divides rank by number of unique words
     * - `16` – divides rank by 1 + log(unique words)
     * Combine them with bitwise OR: `2|4` → `6`.
     */
    normalization?: number;
}

/**
 * Options for {@link matchTsquery}.
 */
export interface MatchTsqueryOptions {
    /** Columns to select (defaults to `*`). */
    columns?: string;
    /** Whether to order results by `ts_rank` descending. */
    order?: boolean;
    /** Maximum number of results. */
    limit?: number;
    /** Normalization weight passed to `ts_rank`. */
    normalization?: number;
}

//#endregion

//#region Constraint & Foreign Key Types

/**
 * Definition of a foreign key constraint for use with
 * {@link applyColumnConstraints}.
 *
 * @typeParam TargetTable - The referenced table name (string literal or `string`).
 * @typeParam TargetColumn - The referenced column name (string literal or `string`).
 *
 * @example
 * ```ts
 * const fk: ForeignKeyConstraint = {
 *   table: "users",
 *   column: "id",
 *   onDelete: "CASCADE",
 * };
 * ```
 */
export interface ForeignKeyConstraint<
    TargetTable = string,
    TargetColumn = string,
> {
    table: TargetTable;
    column: TargetColumn;
    onDelete?: "CASCADE" | "SET NULL" | "SET DEFAULT" | "RESTRICT" | "NO ACTION";
    onUpdate?: "CASCADE" | "SET NULL" | "SET DEFAULT" | "RESTRICT" | "NO ACTION";
}

/**
 * Per-column constraint configuration for use with
 * {@link applyColumnConstraints}.
 */
export interface ColumnConstraints {
    /** Add `NOT NULL` to the column definition. */
    notNull?: boolean;
    /** Add a `DEFAULT` expression to the column definition. */
    default?: ColumnDefaultValue;
    /** Add `UNIQUE` to the column definition. */
    unique?: boolean;
}

//#endregion

//#region Function & Trigger Types

/**
 * Configuration for a single function parameter in
 * {@link FunctionConfig.functionParams}.
 */
export interface FunctionParameter {
    /** PostgreSQL type of the parameter (e.g. `"BOOLEAN"`, `"TEXT"`). */
    type: string;
    /** Default value expression for the parameter. */
    defaultValue?: string;
}

/**
 * Configuration for a JOIN to another table within a trigger function.
 *
 * @typeParam JoinColumn - Column on the joined table used in the ON clause.
 * @typeParam SourceColumn - Column on the source table used in the ON clause.
 * @typeParam SelectColumns - Columns to select from the joined table.
 */
export interface JoinTableConfig<
    JoinColumn extends string = string,
    SourceColumn extends string = string,
    SelectColumns extends string = string,
> {
    joinColumn: JoinColumn;
    sourceColumn: SourceColumn;
    selectColumns: Partial<Record<SelectColumns, boolean>>;
    /**
     * Additional WHERE condition for the JOIN query, appended with `AND`.
     *
     * @example `"active = true"`
     */
    condition?: string;
}

/**
 * Definition of a single PostgreSQL trigger.
 *
 * @typeParam TableName - The table name the trigger is attached to.
 */
export interface TriggerDefinition<TableName extends string = string> {
    tableName: TableName;
    timing: "BEFORE" | "AFTER" | "INSTEAD OF";
    events: Partial<Record<"INSERT" | "UPDATE" | "DELETE" | "TRUNCATE", boolean>>;
    forEach: "ROW" | "STATEMENT";
    /** A `WHEN` condition for the trigger (e.g. `"NEW.role <> 'guest'"`). */
    condition?: string;
}

/**
 * Full configuration for generating a PostgreSQL function and its
 * associated triggers via {@link createFunctionAndTrigger}.
 *
 * @typeParam TrackColumn - Column names to track in new/old values.
 * @typeParam TableName - Table names for triggers.
 * @typeParam JoinTableName - Names of tables to JOIN.
 * @typeParam JoinColumn - Column on the joined table.
 * @typeParam SourceColumn - Column on the source table.
 * @typeParam SelectColumns - Columns selected from the joined table.
 */
export interface FunctionConfig<
    TrackColumn extends string = string,
    TableName extends string = string,
    JoinTableName extends string = string,
    JoinColumn extends string = string,
    SourceColumn extends string = string,
    SelectColumns extends string = string,
> {
    /**
     * Return type of the function.
     *
     * @default "TRIGGER"
     */
    returnType?: string;
    /**
     * Language of the function body.
     *
     * @default "plpgsql"
     */
    language?: string;
    /**
     * Top-level identifier column to include in the notification payload
     * at the root level (e.g. `'user_id'`).
     */
    topLevelIdentifier?: TrackColumn;
    /** Columns whose `NEW` values to include in the notification payload. */
    trackNewValues?: Partial<Record<TrackColumn, boolean>>;
    /** Columns whose `OLD` values to include in the notification payload (UPDATE only). */
    trackOldValues?: Partial<Record<TrackColumn, boolean>>;
    /** Join configurations to enrich the notification payload with data from other tables. */
    joinTables?: Partial<
        Record<JoinTableName, JoinTableConfig<JoinColumn, SourceColumn, SelectColumns>>
    >;
    /** PostgreSQL NOTIFY channel name. If provided, `pg_notify` is called. */
    channelName?: string;
    /**
     * Custom function body. When provided, replaces the auto-generated body
     * entirely. Must be valid PL/pgSQL (or whatever `language` is set to).
     */
    customBody?: string;
    /** Trigger definitions to create for this function. */
    triggers: Record<string, TriggerDefinition<TableName>>;
    /** Optional function parameters with types and defaults. */
    functionParams?: Partial<Record<string, FunctionParameter>>;
}

//#endregion

//#region View Types

/**
 * Definition of a JOIN clause for use in {@link CreateViewConfig}.
 */
export interface ViewJoin {
    type: "INNER" | "LEFT" | "RIGHT" | "FULL";
    table: string;
    alias: string;
    condition: string;
}

/**
 * Configuration object for building a `CREATE OR REPLACE VIEW` statement
 * via {@link buildView}.
 *
 * @typeParam ViewColumn - String literal types for the view's column names,
 * enabling strict type-safe column references.
 *
 * @example
 * ```ts
 * const config: CreateViewConfig<"user_id" | "user_name" | "profile_bio"> = {
 *   name: "user_profiles",
 *   columns: ["user_id", "user_name", "profile_bio"],
 *   from: { table: "users", alias: "u" },
 *   select: ['u.id AS "user_id"', 'u.name AS "user_name"'],
 *   joins: [{
 *     type: "LEFT",
 *     table: "profiles",
 *     alias: "p",
 *     condition: "u.id = p.user_id",
 *   }],
 * };
 * ```
 */
export interface CreateViewConfig<ViewColumn extends string = string> {
    /** Name of the view to create. */
    name: string;
    /** The formal column names of the view (for strict typing). */
    columns: ViewColumn[];
    /** The primary table and its alias. */
    from: { table: string; alias: string };
    /** Column expressions or aliases to SELECT. */
    select: string[];
    /** Optional JOIN clauses. */
    joins?: ViewJoin[];
    /** Optional GROUP BY expression. */
    groupBy?: string;
}

//#endregion
