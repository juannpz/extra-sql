import type { QueryCondition } from "./types.ts";

/**
 * Type guard that checks whether an unknown value is a {@link QueryCondition}.
 *
 * A `QueryCondition` is an object with exactly two own keys: `op` and `val`.
 * It is used in WHERE clauses to support operators beyond simple `=` equality.
 *
 * @param obj - The value to test.
 * @returns `true` if the value is a QueryCondition, `false` otherwise.
 *
 * @example
 * ```ts
 * isQueryCondition({ op: "IN", val: [1, 2, 3] }); // true
 * isQueryCondition({ op: ">" , val: 5 });          // true
 * isQueryCondition({ id: 1 });                     // false
 * isQueryCondition(null);                          // false
 * ```
 */
export function isQueryCondition(obj: unknown): obj is QueryCondition {
    return obj !== null && typeof obj === "object" && "op" in obj &&
        "val" in obj && Object.keys(obj).length === 2;
}

/**
 * Converts nested objects within an iterable collection to JSON strings.
 *
 * Iterates over each element and replaces any property whose value is a
 * plain object (not an `Array` or `Date`) with its JSON stringification.
 * This is useful for preparing data before inserting into JSONB columns.
 *
 * @param data - An iterable of row objects that may contain nested plain objects.
 * @returns A new array with nested objects converted to JSON strings.
 *
 * @example
 * ```ts
 * stringifyObjectsInIterable([
 *   { id: 1, metadata: { name: "test" } }
 * ]);
 * // [{ id: 1, metadata: '{"name":"test"}' }]
 * ```
 */
export function stringifyObjectsInIterable(
    data: Iterable<Record<string, unknown>>,
): Record<string, unknown>[] {
    const items = Array.isArray(data) ? data : Array.from(data);

    return items.map((item) => {
        const stringifiedItem: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(item)) {
            const isObject = value !== null && typeof value === "object" &&
                !Array.isArray(value) && !(value instanceof Date);

            if (isObject) {
                stringifiedItem[key] = JSON.stringify(value);
            } else {
                stringifiedItem[key] = value;
            }
        }

        return stringifiedItem;
    });
}

/**
 * Removes `null` and `undefined` properties from an iterable collection of objects.
 *
 * Each element is processed independently; only properties with non-null,
 * non-undefined values are retained.
 *
 * @param data - An iterable of row objects that may contain null/undefined values.
 * @returns A new array with null/undefined properties stripped.
 *
 * @example
 * ```ts
 * removeNullAndUndefinedFromIterable([
 *   { id: 1, name: "test", optional: undefined }
 * ]);
 * // [{ id: 1, name: "test" }]
 * ```
 */
export function removeNullAndUndefinedFromIterable(
    data: Iterable<Record<string, unknown>>,
): Record<string, unknown>[] {
    const items = Array.isArray(data) ? data : Array.from(data);

    return items.map((item) => {
        const cleanItem: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(item)) {
            if (value !== null && value !== undefined) {
                cleanItem[key] = value;
            }
        }

        return cleanItem;
    });
}

/**
 * Converts nested plain objects within a single object to JSON strings.
 *
 * Any property whose value is a plain object (not `Array` or `Date`)
 * is serialized to a JSON string. Useful for preparing a single row
 * before inserting into JSONB columns.
 *
 * @param data - An object that may contain nested plain objects.
 * @returns A new object with nested objects stringified.
 *
 * @example
 * ```ts
 * stringifyObjectsInObject({
 *   id: 1,
 *   config: { theme: "dark", notifications: true }
 * });
 * // { id: 1, config: '{"theme":"dark","notifications":true}' }
 * ```
 */
export function stringifyObjectsInObject(
    data: Record<string, unknown>,
): Record<string, unknown> {
    const stringifiedObject: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
        const isObject = value !== null && typeof value === "object" &&
            !Array.isArray(value) && !(value instanceof Date);

        if (isObject) {
            stringifiedObject[key] = JSON.stringify(value);
        } else {
            stringifiedObject[key] = value;
        }
    }

    return stringifiedObject;
}

/**
 * Removes `null` and `undefined` properties from a single object.
 *
 * Properties whose value is `null` or `undefined` are removed.
 * {@link QueryCondition} objects are preserved only if their internal
 * `val` is neither `null` nor `undefined`.
 *
 * @param data - An object that may contain null/undefined properties.
 * @returns A new object with null/undefined properties stripped.
 *
 * @example
 * ```ts
 * removeNullAndUndefinedFromObject({
 *   id: 1,
 *   name: "test",
 *   description: null,
 *   category: { op: "IN", val: [1, 2] }
 * });
 * // { id: 1, name: "test", category: { op: "IN", val: [1, 2] } }
 * ```
 */
export function removeNullAndUndefinedFromObject(
    data: Record<string, unknown>,
): Record<string, unknown> {
    const cleanObject: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
            if (isQueryCondition(value)) {
                if (value.val !== null && value.val !== undefined) {
                    cleanObject[key] = value;
                }
            } else {
                cleanObject[key] = value;
            }
        }
    }

    return cleanObject;
}
