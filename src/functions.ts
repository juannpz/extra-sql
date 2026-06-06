import type { FunctionConfig } from "./types.ts";

/**
 * Generates SQL to create a PostgreSQL function and its associated triggers.
 *
 * Produces a complete `CREATE OR REPLACE FUNCTION` statement with an
 * auto-generated PL/pgSQL body that:
 *
 * - Builds a JSONB payload with the table name, action (`TG_OP`), and
 *   optionally a top-level identifier column.
 * - Optionally includes `NEW` and `OLD` values for specified columns.
 * - Optionally JOINs other tables to enrich the notification payload.
 * - Sends the payload via `pg_notify` to a configurable channel.
 * - Creates one or more `CREATE OR REPLACE TRIGGER` statements.
 *
 * If `config.customBody` is provided, the auto-generated body is
 * completely replaced with the custom string.
 *
 * @typeParam TrackColumn - Column names to track in new/old values.
 * @typeParam TableName - Table names for trigger definitions.
 * @typeParam JoinTableName - Names of tables to JOIN.
 * @typeParam JoinColumn - Column on the joined table.
 * @typeParam SourceColumn - Column on the source table.
 * @typeParam SelectColumns - Columns selected from the joined table.
 *
 * @param functionName - Name of the PostgreSQL function to create.
 * @param config - Full configuration for the function and its triggers.
 * @returns SQL statements for creating the function and its triggers.
 *
 * @example
 * ```ts
 * xsql.createFunctionAndTrigger("notify_user_change", {
 *   returnType: "TRIGGER",
 *   language: "plpgsql",
 *   trackNewValues: { name: true, email: true },
 *   trackOldValues: { role: true },
 *   channelName: "user_changes",
 *   triggers: {
 *     user_change_trigger: {
 *       tableName: "users",
 *       timing: "AFTER",
 *       events: { UPDATE: true, INSERT: true },
 *       forEach: "ROW",
 *       condition: "NEW.role <> 'guest'",
 *     },
 *   },
 * });
 * ```
 */
export function createFunctionAndTrigger<
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
    let sql = `CREATE OR REPLACE FUNCTION ${functionName}(`;

    if (config.functionParams && Object.keys(config.functionParams).length > 0) {
        sql += Object.entries(config.functionParams).map(
            ([paramName, paramConfig]) => {
                if (!paramConfig) return "";
                let paramDef = `${paramName} ${paramConfig.type}`;
                if (paramConfig.defaultValue !== undefined) {
                    paramDef += ` DEFAULT ${paramConfig.defaultValue}`;
                }
                return paramDef;
            },
        ).filter(Boolean).join(", ");
    }

    sql += `) RETURNS ${config.returnType || "TRIGGER"} AS $$\n`;

    const isTriggerFunction = config.returnType === undefined ||
        config.returnType === "TRIGGER";

    if (config.customBody) {
        sql += config.customBody;
    } else {
        let functionBody = "";

        const trackNewColumns = config.trackNewValues
            ? Object.keys(config.trackNewValues).filter((key) =>
                config.trackNewValues![key as TrackColumn]
            )
            : [];
        const trackOldColumns = config.trackOldValues
            ? Object.keys(config.trackOldValues).filter((key) =>
                config.trackOldValues![key as TrackColumn]
            )
            : [];
        const joinTableNames = config.joinTables ? Object.keys(config.joinTables) : [];

        const needsDeclare = joinTableNames.length > 0 ||
            trackNewColumns.length > 0 || trackOldColumns.length > 0;

        if (needsDeclare) {
            functionBody += "DECLARE\n  payload JSONB;\n";

            if (joinTableNames.length > 0) {
                for (const tableName of joinTableNames) {
                    functionBody += `  ${tableName}_data JSONB;\n`;
                }
            }

            functionBody += "BEGIN\n";
            functionBody += "  -- Initialize the payload\n";
            functionBody += "  payload = jsonb_build_object(\n";
            functionBody += "    'table', TG_TABLE_NAME,\n";
            functionBody += "    'action', TG_OP";

            if (config.topLevelIdentifier) {
                functionBody +=
                    `,\n    '${config.topLevelIdentifier}', NEW.${config.topLevelIdentifier}`;
            }

            if (trackNewColumns.length > 0) {
                functionBody += ",\n    'new_values', jsonb_build_object(\n";
                functionBody += trackNewColumns.map((col) => `      '${col}', NEW.${col}`)
                    .join(",\n");
                functionBody += "\n    )";
            }

            functionBody += "\n  );\n\n";

            if (trackOldColumns.length > 0) {
                functionBody += "  -- Add old values for UPDATE operations\n";
                functionBody += "  IF TG_OP = 'UPDATE' THEN\n";
                functionBody += "    payload = payload || jsonb_build_object(\n";
                functionBody += "      'old_values', jsonb_build_object(\n";
                functionBody += trackOldColumns.map((col) => `        '${col}', OLD.${col}`)
                    .join(",\n");
                functionBody += "\n      )\n";
                functionBody += "    );\n";
                functionBody += "  END IF;\n\n";
            }

            if (joinTableNames.length > 0 && config.joinTables) {
                for (const tableName of joinTableNames) {
                    const join = config.joinTables?.[tableName as JoinTableName];
                    if (!join) continue;

                    const selectColumnNames = Object.keys(join.selectColumns)
                        .filter((key) => join.selectColumns[key as SelectColumns]);

                    functionBody += `  -- Join with ${tableName} table\n`;
                    functionBody += `  SELECT jsonb_build_object(\n`;
                    functionBody += selectColumnNames.map((col) => `    '${col}', ${col}`)
                        .join(",\n");
                    functionBody += `\n  ) INTO ${tableName}_data\n`;
                    functionBody += `  FROM ${tableName}\n`;
                    functionBody += `  WHERE ${join.joinColumn} = NEW.${join.sourceColumn}`;

                    if (join.condition) {
                        functionBody += ` AND ${join.condition}`;
                    }

                    functionBody += `;\n\n`;
                    functionBody += `  -- Add joined data to payload\n`;
                    functionBody +=
                        `  payload = payload || jsonb_build_object('${tableName}', ${tableName}_data);\n\n`;
                }
            }

            if (config.channelName) {
                functionBody += `  -- Send notification\n`;
                functionBody += `  PERFORM pg_notify('${config.channelName}', payload::text);\n\n`;
            }

            if (isTriggerFunction) {
                functionBody += "  -- Return for trigger function\n";
                functionBody += "  RETURN NEW;\n";
            } else {
                functionBody += "  -- Return for non-trigger function\n";
                functionBody += "  RETURN;\n";
            }

            functionBody += "END;";
        } else {
            functionBody = "BEGIN\n";

            if (config.channelName) {
                if (isTriggerFunction) {
                    functionBody +=
                        `  PERFORM pg_notify('${config.channelName}', row_to_json(NEW)::text);\n\n`;
                } else {
                    functionBody += `  PERFORM pg_notify('${config.channelName}', '{}'::text);\n\n`;
                }
            }

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

    sql += `\n$$ LANGUAGE ${config.language || "plpgsql"};\n`;

    if (config.triggers) {
        for (const [triggerName, trigger] of Object.entries(config.triggers)) {
            sql += `\nCREATE OR REPLACE TRIGGER ${triggerName}\n`;
            sql += `${trigger.timing} `;

            const events = Object.entries(trigger.events)
                .filter(([_, isEnabled]) => isEnabled)
                .map(([eventName, _]) => eventName);

            sql += `${events.join(" OR ")} ON "${trigger.tableName}"\n`;
            sql += `FOR EACH ${trigger.forEach}\n`;

            if (trigger.condition) {
                sql += `WHEN (${trigger.condition})\n`;
            }

            sql += `EXECUTE FUNCTION ${functionName}();\n`;
        }
    }

    return sql;
}
