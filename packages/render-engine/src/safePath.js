import path from "node:path";
import fs from "node:fs/promises";
import { isWithinDirectory } from "@widgetizer/core/pathSecurity";

/**
 * Containment for every file the engine opens.
 *
 * The engine builds read paths from values it does not control. A widget's
 * `type` comes straight out of page JSON, so `widgets/<type>/widget.liquid`
 * is attacker-influenced wherever pages are authored by someone who shouldn't
 * reach outside their own project — which is the whole premise of a
 * multi-tenant host. `..` in a type escapes the project dir; a symlink escapes
 * it without any `..` at all, because containment on strings can't see where a
 * link actually points.
 *
 * Both are closed here: resolve lexically, check, then resolve the link chain
 * and check again. This stays scope-free — it only ever uses roots the caller
 * already supplied in `deps` (projectDir, coreWidgetsDir), so it works
 * identically for the OSS single-user shells and an embedding host.
 *
 * The fs dependency is why this lives in render-engine rather than beside
 * `isWithinDirectory` in @widgetizer/core: core is shared with the browser
 * bundle, and `node:fs` must not follow it there.
 *
 * Returns the LEXICAL path, never the link-resolved one: the resolved form is
 * used to validate and then discarded, so callers get back the path they asked
 * for whether or not it exists yet, and log messages name the file the author
 * actually configured. (It also keeps the contract stable on macOS, where
 * realpath rewrites /var to /private/var.)
 *
 * @param {string} baseDir  root the result must stay inside
 * @param {...string} segments  path segments, any of which may be hostile
 * @returns {Promise<string|null>} absolute path, or null if it escapes
 */
export async function resolveInside(baseDir, ...segments) {
  if (!baseDir) return null;
  const base = path.resolve(baseDir);
  const target = path.resolve(base, ...segments.map(String));

  // Lexical first: rejects `..` and absolute segments without touching disk.
  if (!isWithinDirectory(base, target)) return null;

  try {
    // realpath the BASE too: a project dir may legitimately be reached through
    // a symlink (a mounted volume), and comparing a resolved target against an
    // unresolved base would then reject every read under it.
    const realTarget = await fs.realpath(target);
    const realBase = await fs.realpath(base);
    return isWithinDirectory(realBase, realTarget) ? target : null;
  } catch (err) {
    // Missing file (or a link resolving nowhere): hand back the contained
    // lexical path so the caller's own read fails in its usual way — a missing
    // widget template is normal and already renders an error placeholder.
    if (err.code === "ENOENT" || err.code === "ENOTDIR") return target;
    throw err;
  }
}
