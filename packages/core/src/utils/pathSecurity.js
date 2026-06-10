import path from "path";

/**
 * Path-containment guard shared by both shells. One implementation; callers
 * choose the boundary semantics via `allowEqual`, because the two original
 * copies (builder-server's isWithinDirectory and adapters-local's assertWithin)
 * had drifted on exactly that edge: whether `target === base` counts as inside.
 *
 * Both paths should already be resolved (`path.resolve`) before calling.
 *
 * Unlike the naive `target.startsWith(base)` pattern, this correctly rejects
 * sibling directories that share a prefix (e.g. `/data/publish-evil` is NOT
 * inside `/data/publish`).
 *
 * @param {string} base    Resolved absolute base directory
 * @param {string} target  Resolved absolute path to check
 * @param {{ allowEqual?: boolean }} [opts]  When true, `target === base` counts
 *   as contained. Default false (the directory is not "within" itself).
 * @returns {boolean} true when target is inside base (per allowEqual)
 */
export function isWithinDirectory(base, target, { allowEqual = false } = {}) {
  const rel = path.relative(base, target);
  if (rel === "") return allowEqual;
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Assert `target` is within `base`, throwing if it escapes.
 *
 * @param {string} base    Resolved absolute base directory
 * @param {string} target  Resolved absolute path to check
 * @param {{ allowEqual?: boolean }} [opts]  See isWithinDirectory.
 */
export function assertWithin(base, target, { allowEqual = false } = {}) {
  if (!isWithinDirectory(base, target, { allowEqual })) {
    throw new Error(`Path escapes allowed directory: ${target}`);
  }
}
