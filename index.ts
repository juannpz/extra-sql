/**
 * @juannpz/extra-sql
 *
 * **Backward-compatible entry point.**
 *
 * This file re-exports everything from `./mod.ts` to ensure existing
 * imports like `import ... from "@juannpz/extra-sql"` continue to work
 * without changes.
 *
 * For new code, consider using the manager classes available via
 * {@link SqlBuilder} from `mod.ts`.
 *
 * @module
 */

export * from "./mod.ts";
