import { isWithinDirectory as coreIsWithin } from "@widgetizer/core/pathSecurity";

/**
 * Check whether `filePath` is contained within `allowedBase`.
 *
 * Thin wrapper over @widgetizer/core/pathSecurity (the single implementation).
 * Preserves this module's historical `(filePath, allowedBase)` argument order
 * and its "the base directory is NOT within itself" semantics (`allowEqual:
 * false`) — many call sites and pathSecurity.test.js depend on both.
 *
 * Both paths should already be resolved (`path.resolve`) before calling.
 *
 * @param {string} filePath  - Resolved absolute path to check
 * @param {string} allowedBase - Resolved absolute base directory
 * @returns {boolean} true when filePath is inside allowedBase
 */
export function isWithinDirectory(filePath, allowedBase) {
  return coreIsWithin(allowedBase, filePath, { allowEqual: false });
}
