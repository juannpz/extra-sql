/**
 * Manager classes providing an object-oriented API for SQL generation.
 *
 * Each manager wraps a set of related functions from the core modules,
 * offering an alternative, more structured interface. The procedural
 * function-based API continues to be available for backward compatibility.
 */

import type {
    ColumnConstraints,
    ColumnTypes,
    CreateIndexOptions,
    CreateTableOptions,
    CreateViewConfig,
    ForeignKeyConstraint,
    FunctionConfig,
    InsertIntoDataOptions,
    InsertIntoOptions,
    MatchTsqueryOptions,
    QueryData,
    RowData,
    SelectDataOptions,
    SelectTsqueryOptions,
    SetupTableIndexOptions,
    SetupTableOptions,
    UpdateDataOptions,
} from "./types.ts";
import {
    buildView,
    createIndex,
    createTable,
    createUniqueIndex,
    createView,
    setupTable,
    setupTableIndex,
    tableExists,
} from "./ddl.ts";
import {
    createTableData,
    deleteData,
    incrementData,
    insertInto,
    insertIntoData,
    selectData,
    updateData,
} from "./dml.ts";
import { matchTsquery, selectTsquery } from "./fts.ts";
import { applyColumnConstraints } from "./constraints.ts";
import { createFunctionAndTrigger } from "./functions.ts";

//#region TableManager

/**
 * Manager for table-related SQL generation (DDL).
 *
 * Provides methods for CREATE TABLE, existence checks, and full table setup.
 *
 * @example
 * ```ts
 * const manager = new TableManager();
 * manager.create("users", { id: "SERIAL", name: "TEXT" }, { pk: "id" });
 * manager.createData("users", { id: "SERIAL", name: "TEXT" }, "id");
 * manager.exists("users");
 * ```
 */
export class TableManager {
    /**
     * Generates a `CREATE TABLE IF NOT EXISTS` statement.
     *
     * @param name - Table name.
     * @param cols - Column definitions `{ col: "TYPE" }`.
     * @param opt - Options: `pk` for primary key column.
     * @returns Raw SQL statement.
     */
    create(name: string, cols: ColumnTypes, opt?: CreateTableOptions): string {
        return createTable(name, cols, opt);
    }

    /**
     * Generates a parameterized `CREATE TABLE IF NOT EXISTS` query.
     *
     * @param table - Table name.
     * @param cols - Column type definitions.
     * @param pkeys - Primary key column(s).
     * @returns QueryData with SQL and parameters.
     */
    createData(
        table: string,
        cols: ColumnTypes,
        pkeys?: string | Iterable<string>,
    ): QueryData {
        return createTableData(table, cols, pkeys);
    }

    /**
     * Generates a query to check whether a table exists.
     *
     * @param name - Table name.
     * @returns SQL `SELECT EXISTS(...)` statement.
     */
    exists(name: string): string {
        return tableExists(name);
    }

    /**
     * Generates the full table setup: CREATE TABLE, INSERT, and indexes.
     *
     * @param name - Table name.
     * @param cols - Column type definitions.
     * @param rows - Optional rows to insert.
     * @param opt - Setup options: `pk`, `index`, `tsvector`.
     * @returns Concatenated SQL statements.
     */
    setup(
        name: string,
        cols: ColumnTypes,
        rows?: Iterable<RowData> | null,
        opt?: SetupTableOptions,
    ): string {
        return setupTable(name, cols, rows, opt);
    }
}

//#endregion

//#region IndexManager

/**
 * Manager for index-related SQL generation.
 *
 * Provides methods for creating indexes (standard, unique, GIN) and
 * full-text search index setup.
 *
 * @example
 * ```ts
 * const manager = new IndexManager();
 * manager.create("idx_name", "users", '"name"');
 * manager.create("idx_name_gin", "users", '"name"', { method: "GIN" });
 * manager.createUnique("idx_email", "users", '"email"');
 * ```
 */
export class IndexManager {
    /**
     * Generates a `CREATE INDEX IF NOT EXISTS` statement.
     *
     * @param name - Index name.
     * @param table - Table name.
     * @param expr - Index expression.
     * @param opt - Options: `method` (`BTREE`, `GIN`, `GiST`, `HASH`).
     * @returns Raw SQL statement.
     */
    create(
        name: string,
        table: string,
        expr: string,
        opt?: CreateIndexOptions,
    ): string {
        return createIndex(name, table, expr, opt);
    }

    /**
     * Generates a `CREATE UNIQUE INDEX IF NOT EXISTS` statement.
     *
     * @param indexName - Index name.
     * @param tableName - Table name.
     * @param columns - Column(s) expression.
     * @returns Raw SQL statement.
     */
    createUnique<Table extends string>(
        indexName: string,
        tableName: Table,
        columns: string,
    ): string {
        return createUniqueIndex(indexName, tableName, columns);
    }

    /**
     * Generates index and tsvector setup for a table.
     *
     * @param table - Table name.
     * @param cols - Column type definitions.
     * @param opt - Setup options: `pk`, `index`, `tsvector`.
     * @returns Concatenated SQL statements.
     */
    setup(
        table: string,
        cols: ColumnTypes,
        opt?: SetupTableIndexOptions,
    ): string {
        return setupTableIndex(table, cols, opt);
    }
}

//#endregion

//#region ViewManager

/**
 * Manager for view-related SQL generation.
 *
 * Provides methods for creating views, both via raw SQL and structured
 * configuration objects.
 *
 * @example
 * ```ts
 * const manager = new ViewManager();
 * manager.create("active_users", 'SELECT * FROM "users" WHERE active = true');
 * ```
 */
export class ViewManager {
    /**
     * Generates a `CREATE OR REPLACE VIEW` statement from a raw SELECT query.
     *
     * @param name - View name.
     * @param query - The SELECT query defining the view.
     * @param opt - Reserved for future options.
     * @returns Raw SQL statement.
     */
    create(name: string, query: string, opt?: object | null): string {
        return createView(name, query, opt);
    }

    /**
     * Builds a `CREATE OR REPLACE VIEW` from a structured configuration.
     *
     * @param config - Full view configuration with columns, FROM, JOINs, GROUP BY.
     * @returns Raw SQL statement.
     */
    build<ViewColumn extends string = string>(
        config: CreateViewConfig<ViewColumn>,
    ): string {
        return buildView<ViewColumn>(config);
    }
}

//#endregion

//#region DataManager (DML)

/**
 * Manager for data manipulation (DML) SQL generation.
 *
 * Provides parameterized methods for INSERT, UPDATE, DELETE, SELECT,
 * and atomic increment operations.
 *
 * All methods return {@link QueryData} objects with `$N` placeholders,
 * except for {@link insertRaw} which returns raw SQL with `$$...$$` values.
 *
 * @example
 * ```ts
 * const dm = new DataManager();
 * dm.insert("users", [{ id: 1, name: "Alice" }]);
 * dm.select("users", { active: true }, "=", "AND", { limit: 10 });
 * dm.update("users", { name: "Bob" }, { id: 1 });
 * dm.delete("users", { id: 1 });
 * dm.increment("users", { login_count: 1 }, { id: 42 });
 * ```
 */
export class DataManager {
    /**
     * Generates a raw (inline-value) INSERT INTO statement.
     *
     * @param table - Table name.
     * @param rows - Iterable of row objects.
     * @param opt - Options: `pk` for ON CONFLICT, `returning`.
     * @returns Raw SQL statement.
     */
    insertRaw(
        table: string,
        rows: Iterable<RowData>,
        opt?: InsertIntoOptions,
    ): string {
        return insertInto(table, rows, opt);
    }

    /**
     * Generates a parameterized INSERT INTO query.
     *
     * @param table - Table name.
     * @param rows - Array of row objects.
     * @param opt - Options: `returning` to append RETURNING *.
     * @returns QueryData with SQL and parameters.
     */
    insert(
        table: string,
        rows: RowData[],
        opt?: InsertIntoDataOptions,
    ): QueryData {
        return insertIntoData(table, rows, opt);
    }

    /**
     * Generates a parameterized UPDATE query.
     *
     * @param table - Table name.
     * @param set - Columns to update: `{ column: newValue }`.
     * @param where - WHERE conditions: `{ column: value }`.
     * @param op - Comparison operator (default `"="`).
     * @param sep - Logical separator (default `"AND"`).
     * @param opt - Options: `returning` to append RETURNING *.
     * @returns QueryData with SQL and parameters.
     */
    update(
        table: string,
        set: RowData,
        where: RowData,
        op?: string,
        sep?: string,
        opt?: UpdateDataOptions,
    ): QueryData {
        return updateData(table, set, where, op, sep, opt);
    }

    /**
     * Generates an arithmetic UPDATE query for atomic increments/decrements.
     *
     * Produces `SET "col" = "col" + $N` to avoid read-before-write races.
     *
     * @param table - Table name.
     * @param increments - Columns and increment values.
     * @param where - WHERE conditions.
     * @param par - Optional pre-populated parameter array.
     * @returns QueryData with RETURNING *.
     */
    increment(
        table: string,
        increments: RowData,
        where: RowData,
        par?: unknown[],
    ): QueryData {
        return incrementData(table, increments, where, par);
    }

    /**
     * Generates a parameterized SELECT query.
     *
     * @param tab - Table name.
     * @param whr - WHERE conditions.
     * @param op - Comparison operator (default `"="`).
     * @param sep - Logical separator (default `"AND"`).
     * @param opt - Options: `columns`, `limit`, `offset`, `orderBy`, `orderDirection`.
     * @returns QueryData with SQL and parameters.
     */
    select(
        tab: string,
        whr: RowData,
        op?: string,
        sep?: string,
        opt?: SelectDataOptions,
    ): QueryData {
        return selectData(tab, whr, op, sep, opt);
    }

    /**
     * Generates a parameterized DELETE query.
     *
     * @param table - Table name.
     * @param where - WHERE conditions.
     * @param op - Comparison operator (default `"="`).
     * @param sep - Logical separator (default `"AND"`).
     * @returns QueryData with SQL and parameters.
     */
    delete(
        table: string,
        where: RowData,
        op?: string,
        sep?: string,
    ): QueryData {
        return deleteData(table, where, op, sep);
    }
}

//#endregion

//#region FtsManager

/**
 * Manager for PostgreSQL full-text search SQL generation.
 *
 * Provides methods for generating `SELECT` queries using `tsvector`
 * and `tsquery` for full-text search with ranking.
 *
 * @example
 * ```ts
 * const fts = new FtsManager();
 * fts.search("articles", "total fat");
 * fts.match("articles", ["total", "fat"]);
 * ```
 */
export class FtsManager {
    /**
     * Generates a full-text search SELECT using `plainto_tsquery`.
     *
     * @param table - Table name.
     * @param query - Plain query words.
     * @param tsv - tsvector column name (default `'"tsvector"'`).
     * @param opt - Options: `columns`, `order`, `limit`, `normalization`.
     * @returns Raw SQL statement.
     */
    search(
        table: string,
        query: string,
        tsv?: string,
        opt?: SelectTsqueryOptions,
    ): string {
        return selectTsquery(table, query, tsv, opt);
    }

    /**
     * Generates a multi-term tsquery matching query with `UNION ALL`.
     *
     * @param table - Table name.
     * @param words - Array of search terms.
     * @param tsv - tsvector column name (default `'"tsvector"'`).
     * @param opt - Options: `columns`, `order`, `limit`, `normalization`.
     * @returns Raw SQL statement.
     */
    match(
        table: string,
        words: string[],
        tsv?: string,
        opt?: MatchTsqueryOptions,
    ): string {
        return matchTsquery(table, words, tsv, opt);
    }
}

//#endregion

//#region FunctionManager

/**
 * Manager for PostgreSQL function and trigger generation.
 *
 * Produces `CREATE OR REPLACE FUNCTION` statements with auto-generated
 * PL/pgSQL bodies for change-notification patterns via `pg_notify`,
 * plus associated `CREATE TRIGGER` statements.
 *
 * @example
 * ```ts
 * const fm = new FunctionManager();
 * fm.create("notify_change", {
 *   trackNewValues: { name: true, email: true },
 *   channelName: "user_changes",
 *   triggers: {
 *     user_trigger: {
 *       tableName: "users",
 *       timing: "AFTER",
 *       events: { UPDATE: true, INSERT: true },
 *       forEach: "ROW",
 *     },
 *   },
 * });
 * ```
 */
export class FunctionManager {
    /**
     * Generates a PostgreSQL function and its associated triggers.
     *
     * @param functionName - Name of the function.
     * @param config - Full function and trigger configuration.
     * @returns SQL statements for creating the function and triggers.
     */
    create<
        TrackColumn extends string = string,
        TableName extends string = string,
        JoinTableName extends string = string,
        JoinColumn extends string = string,
        SourceColumn extends string = string,
        SelectColumns extends string = string,
    >(
        functionName: string,
        config: FunctionConfig<
            TrackColumn,
            TableName,
            JoinTableName,
            JoinColumn,
            SourceColumn,
            SelectColumns
        >,
    ): string {
        return createFunctionAndTrigger(functionName, config);
    }
}

//#endregion

//#region ConstraintManager

/**
 * Manager for applying column constraints to CREATE TABLE statements.
 *
 * Post-processes a base CREATE TABLE query by injecting NOT NULL,
 * DEFAULT, UNIQUE, foreign key references, and table-level constraints.
 *
 * @example
 * ```ts
 * const cm = new ConstraintManager();
 * cm.apply(
 *   'CREATE TABLE "t" ("id" SERIAL, "ref" INT)',
 *   { ref: { notNull: true } },
 *   { ref: { table: "other", column: "id", onDelete: "CASCADE" } },
 * );
 * ```
 */
export class ConstraintManager {
    /**
     * Applies column constraints, foreign keys, and table-level
     * constraints to a CREATE TABLE query.
     *
     * @param query - The base CREATE TABLE SQL string.
     * @param constraints - Per-column constraint definitions.
     * @param foreignKeys - Optional foreign key definitions.
     * @param tableConstraints - Optional raw table-level constraints.
     * @returns The modified CREATE TABLE SQL string.
     */
    apply<
        SourceColumn extends string = string,
        TargetTable extends string = string,
        TargetColumn extends string = string,
    >(
        query: string,
        constraints: Partial<Record<SourceColumn, ColumnConstraints>>,
        foreignKeys?: Partial<
            Record<SourceColumn, ForeignKeyConstraint<TargetTable, TargetColumn>>
        >,
        tableConstraints?: string[],
    ): string {
        return applyColumnConstraints(query, constraints, foreignKeys, tableConstraints);
    }
}

//#endregion

//#region SqlBuilder (facade)

/**
 * Facade providing convenient access to all SQL generation managers.
 *
 * This is the recommended entry point for the object-oriented API.
 * Each manager is available as a property:
 * - {@link table} – CREATE TABLE, existence checks, full setup
 * - {@link index} – CREATE INDEX, unique indexes, index setup
 * - {@link view} – CREATE VIEW, structured view building
 * - {@link data} – INSERT, UPDATE, DELETE, SELECT (parameterized)
 * - {@link fts} – Full-text search queries
 * - {@link func} – Function and trigger generation
 * - {@link constraint} – Column constraint application
 *
 * @example
 * ```ts
 * import { SqlBuilder } from "@juannpz/extra-sql";
 *
 * const sql = new SqlBuilder();
 *
 * // Create a table
 * sql.table.create("users", { id: "SERIAL", name: "TEXT" }, { pk: "id" });
 *
 * // Insert data (parameterized)
 * const { query, data } = sql.data.insert("users", [{ id: 1, name: "Alice" }]);
 *
 * // Full-text search
 * sql.fts.search("articles", "typescript deno");
 * ```
 */
export class SqlBuilder {
    /** Table DDL operations (CREATE TABLE, exists, setup). */
    readonly table = new TableManager();

    /** Index operations (CREATE INDEX, unique indexes, index setup). */
    readonly index = new IndexManager();

    /** View operations (CREATE VIEW, structured view building). */
    readonly view = new ViewManager();

    /** Data manipulation operations (INSERT, UPDATE, DELETE, SELECT). */
    readonly data = new DataManager();

    /** Full-text search operations. */
    readonly fts = new FtsManager();

    /** Function and trigger generation. */
    readonly func = new FunctionManager();

    /** Column constraint application. */
    readonly constraint = new ConstraintManager();
}

//#endregion
