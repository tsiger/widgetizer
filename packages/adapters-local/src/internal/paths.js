import path from "path";

// Mirrors @widgetizer/builder-server's pathSecurity.isWithinDirectory. Kept
// local so the local adapters have no dependency on builder-server. (A future
// consolidation could move the shared helper into @widgetizer/core.)
export function assertWithin(base, target) {
  const rel = path.relative(base, target);
  if (rel !== "" && (rel.startsWith("..") || path.isAbsolute(rel))) {
    throw new Error(`Path escapes allowed directory: ${target}`);
  }
}
