import path from "path";

/**
 * Check whether `filePath` is contained within `allowedBase`.
 *
 * Unlike the naive `filePath.startsWith(allowedBase)` pattern, this
 * correctly rejects sibling directories that share the same prefix
 * (e.g. `/data/publish-evil` would pass a startsWith check against
 * `/data/publish` but is not actually inside it).
 *
 * Both paths should already be resolved (`path.resolve`) before calling.
 *
 * @param {string} filePath  - Resolved absolute path to check
 * @param {string} allowedBase - Resolved absolute base directory
 * @returns {boolean} true when filePath is inside allowedBase
 */
export function isWithinDirectory(filePath, allowedBase) {
  const rel = path.relative(allowedBase, filePath);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
