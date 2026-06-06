import type { ColumnConstraints, ForeignKeyConstraint } from "./types.ts";

/**
 * Applies column constraints, foreign key relationships, and table-level
 * constraints to an existing `CREATE TABLE` SQL string.
 *
 * This is a post-processing function that enhances a base CREATE TABLE
 * statement by injecting:
 *
 * 1. **Per-column constraints** – `NOT NULL`, `DEFAULT`, `UNIQUE` for
 *    each column specified in `constraints`.
 * 2. **Foreign key constraints** – `FOREIGN KEY` references for each
 *    column specified in `foreignKeys`.
 * 3. **Table-level constraints** – Raw SQL expressions appended at the
 *    end of the table definition (for composite UNIQUE, CHECK, etc.).
 *
 * @typeParam SourceColumn - String literal types for source column names.
 * @typeParam TargetTable - String literal types for referenced table names.
 * @typeParam TargetColumn - String literal types for referenced column names.
 *
 * @param query - The original CREATE TABLE SQL query string.
 * @param constraints - Column constraints mapping column names to constraint configs.
 * @param foreignKeys - Optional foreign key definitions.
 * @param tableConstraints - Optional array of raw SQL table-level constraints.
 * @returns The modified CREATE TABLE SQL string with all constraints applied.
 *
 * @example
 * ```ts
 * applyColumnConstraints(
 *   'CREATE TABLE "user_credentials" ("identity_id" SERIAL, "user_id" INTEGER)',
 *   { user_id: { notNull: true, unique: true } },
 *   { user_id: { table: "users", column: "user_id", onDelete: "CASCADE" } }
 * );
 * // Appends NOT NULL, UNIQUE, and FOREIGN KEY constraints
 * ```
 */
export function applyColumnConstraints<
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
    let modifiedQuery = query;

    for (
        const [columnName, columnConstraints] of Object.entries(constraints) as [
            SourceColumn,
            ColumnConstraints,
        ][]
    ) {
        const pattern = new RegExp(`"${columnName}"\\s+([^,)]+?)(?=,|\\)|$)`);

        modifiedQuery = modifiedQuery.replace(pattern, (match) => {
            let result = match.trim();

            if (columnConstraints.notNull && !result.includes("NOT NULL")) {
                result += " NOT NULL";
            }

            if (columnConstraints.default && !result.includes("DEFAULT")) {
                result += ` DEFAULT ${columnConstraints.default}`;
            }

            if (columnConstraints.unique && !result.includes("UNIQUE")) {
                result += " UNIQUE";
            }

            return result;
        });
    }

    if (foreignKeys && Object.keys(foreignKeys).length > 0) {
        const lastParenIndex = modifiedQuery.lastIndexOf(")");

        if (lastParenIndex !== -1) {
            const foreignKeysConstraints = (
                Object.entries(foreignKeys) as [
                    SourceColumn,
                    ForeignKeyConstraint<TargetTable, TargetColumn>,
                ][]
            )
                .map(([columnName, fkInfo]) => {
                    let constraint =
                        `,\n  CONSTRAINT "fk_${columnName}" FOREIGN KEY ("${columnName}") `;
                    constraint += `REFERENCES ${fkInfo.table}("${fkInfo.column}")`;

                    if (fkInfo.onDelete) {
                        constraint += ` ON DELETE ${fkInfo.onDelete}`;
                    }

                    if (fkInfo.onUpdate) {
                        constraint += ` ON UPDATE ${fkInfo.onUpdate}`;
                    }

                    return constraint;
                }).join("");

            modifiedQuery = modifiedQuery.slice(0, lastParenIndex) +
                foreignKeysConstraints + modifiedQuery.slice(lastParenIndex);
        }
    }

    if (tableConstraints && tableConstraints.length > 0) {
        const lastParenIndex = modifiedQuery.lastIndexOf(")");

        if (lastParenIndex !== -1) {
            const tableConstraintsStr = tableConstraints.map((c) => `,\n  ${c}`)
                .join("");
            modifiedQuery = modifiedQuery.slice(0, lastParenIndex) +
                tableConstraintsStr + modifiedQuery.slice(lastParenIndex);
        }
    }

    return modifiedQuery;
}
