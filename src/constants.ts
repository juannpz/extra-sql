/**
 * Set of supported SQL operators.
 *
 * Includes arithmetic (`+`, `-`, `*`, `/`, `%`), bitwise (`&`, `|`, `^`),
 * comparison (`=`, `>`, `<`, `>=`, `<=`, `<>`), compound (`+=`, `-=`, `*=`,
 * `/=`, `%=`, `&=`, `^=`, `|=`), and logical (`ALL`, `AND`, `ANY`,
 * `BETWEEN`, `EXISTS`, `IN`, `LIKE`, `NOT`, `OR`, `SOME`) operators.
 *
 * @example
 * ```ts
 * import { OPERATORS } from "@juannpz/extra-sql";
 * OPERATORS.has("=");   // true
 * OPERATORS.has("LIKE"); // true
 * ```
 */
export const OPERATORS: ReadonlySet<string> = new Set([
    "+",
    "-",
    "*",
    "/",
    "%",
    "&",
    "|",
    "^",
    "=",
    ">",
    "<",
    ">=",
    "<=",
    "<>",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "&=",
    "^=",
    "|=",
    "ALL",
    "AND",
    "ANY",
    "BETWEEN",
    "EXISTS",
    "IN",
    "LIKE",
    "NOT",
    "OR",
    "SOME",
]);

/**
 * Maps each SQL operator to the number of operands it expects.
 *
 * Most operators are binary (2 operands). `BETWEEN` uses 3 operands
 * (`a BETWEEN x AND y`). `NOT` and `EXISTS` are unary (1 operand).
 *
 * @example
 * ```ts
 * import { OPERAND_COUNT } from "@juannpz/extra-sql";
 * OPERAND_COUNT.get("=");       // 2
 * OPERAND_COUNT.get("BETWEEN"); // 3
 * OPERAND_COUNT.get("NOT");     // 1
 * ```
 */
export const OPERAND_COUNT: ReadonlyMap<string, number> = new Map([
    ["+", 2],
    ["-", 2],
    ["*", 2],
    ["/", 2],
    ["%", 2],
    ["&", 2],
    ["|", 2],
    ["^", 2],
    ["=", 2],
    [">", 2],
    ["<", 2],
    [">=", 2],
    ["<=", 2],
    ["<>", 2],
    ["+=", 2],
    ["-=", 2],
    ["*=", 2],
    ["/=", 2],
    ["%=", 2],
    ["&=", 2],
    ["^=", 2],
    ["|=", 2],
    ["ALL", 2],
    ["AND", 2],
    ["ANY", 2],
    ["BETWEEN", 3],
    ["EXISTS", 1],
    ["IN", 2],
    ["LIKE", 2],
    ["NOT", 1],
    ["OR", 2],
    ["SOME", 2],
]);

/**
 * Enum of common PostgreSQL column default values.
 *
 * For use with {@link ColumnConstraints.default} when applying column constraints
 * via {@link applyColumnConstraints}.
 *
 * @example
 * ```ts
 * import { ColumnDefaultValue } from "@juannpz/extra-sql";
 * ColumnDefaultValue.CURRENT_TIMESTAMP; // "CURRENT_TIMESTAMP"
 * ColumnDefaultValue.UUID;              // "gen_random_uuid()"
 * ```
 */
export enum ColumnDefaultValue {
    CURRENT_TIMESTAMP = "CURRENT_TIMESTAMP",
    NOW = "NOW()",
    NULL = "NULL",
    TRUE = "TRUE",
    FALSE = "FALSE",
    ZERO = "0",
    EMPTY_STRING = "''",
    EMPTY_JSONB = "'{}'",
    ONE = "1",
    UUID = "gen_random_uuid()",
}
