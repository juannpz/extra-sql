/**
 * @juannpz/extra-sql
 *
 * A PostgreSQL SQL command generation library for Deno.
 *
 * ## Usage
 *
 * ### Procedural API (legacy compatible)
 *
 * ```ts
 * import * as xsql from "@juannpz/extra-sql";
 *
 * // Generate a CREATE TABLE statement
 * xsql.createTable("users", { id: "SERIAL", name: "TEXT" }, { pk: "id" });
 *
 * // Generate a parameterized INSERT query
 * const { query, data } = xsql.insertIntoData("users", [{ id: 1, name: "Alice" }]);
 * ```
 *
 * ### Object-Oriented API (managers)
 *
 * ```ts
 * import { SqlBuilder } from "@juannpz/extra-sql";
 *
 * const sql = new SqlBuilder();
 * sql.table.create("users", { id: "SERIAL", name: "TEXT" }, { pk: "id" });
 * const { query, data } = sql.data.insert("users", [{ id: 1, name: "Alice" }]);
 * ```
 *
 * @module
 */

// Constants
export { ColumnDefaultValue, OPERAND_COUNT, OPERATORS } from "./src/constants.ts";

// Types
export type {
    ColumnConstraints,
    ColumnTypes,
    ColumnWeights,
    CreateIndexOptions,
    CreateTableOptions,
    CreateViewConfig,
    ForeignKeyConstraint,
    FunctionConfig,
    FunctionParameter,
    InsertIntoDataOptions,
    InsertIntoOptions,
    JoinTableConfig,
    MatchTsqueryOptions,
    QueryCondition,
    QueryData,
    RowData,
    SelectDataOptions,
    SelectTsqueryOptions,
    SetupTableIndexOptions,
    SetupTableOptions,
    TriggerDefinition,
    UpdateDataOptions,
    ViewJoin,
} from "./src/types.ts";

// Utilities
export {
    isQueryCondition,
    removeNullAndUndefinedFromIterable,
    removeNullAndUndefinedFromObject,
    stringifyObjectsInIterable,
    stringifyObjectsInObject,
} from "./src/utils.ts";

// DDL
export {
    buildView,
    createIndex,
    createTable,
    createUniqueIndex,
    createView,
    setupTable,
    setupTableIndex,
    tableExists,
} from "./src/ddl.ts";

// DML
export {
    createTableData,
    deleteData,
    incrementData,
    insertInto,
    insertIntoData,
    selectData,
    updateData,
} from "./src/dml.ts";

// Full-Text Search
export { matchTsquery, selectTsquery } from "./src/fts.ts";

// Constraints
export { applyColumnConstraints } from "./src/constraints.ts";

// Functions & Triggers
export { createFunctionAndTrigger } from "./src/functions.ts";

// Manager classes (OOP API)
export {
    ConstraintManager,
    DataManager,
    FtsManager,
    FunctionManager,
    IndexManager,
    SqlBuilder,
    TableManager,
    ViewManager,
} from "./src/managers.ts";
