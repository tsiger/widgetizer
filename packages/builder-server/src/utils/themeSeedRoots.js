// Per-theme seed-root resolution. A theme is owned wholesale by the FIRST root
// in THEMES_SEED_DIRS that contains <id>/theme.json — extra roots come before
// the primary seed root, so an embedding host can shadow a bundled theme
// intentionally. The theme.json requirement stops a stray empty dir from
// shadowing a real theme.
import fs from "fs-extra";
import path from "path";
import { THEMES_SEED_DIRS } from "../config.js";

/** @returns {Promise<string|null>} absolute seed dir for the theme, or null */
export async function resolveSeedThemeDir(themeId, roots = THEMES_SEED_DIRS) {
  for (const root of roots) {
    const dir = path.join(root, themeId);
    if (await fs.pathExists(path.join(dir, "theme.json"))) return dir;
  }
  return null;
}

/** Union of theme ids across all roots (first occurrence order, deduped). */
export async function listSeedThemeIds(roots = THEMES_SEED_DIRS) {
  const ids = [];
  for (const root of roots) {
    let entries;
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      continue; // root missing — fine, same as today's seedExists check
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !ids.includes(entry.name)) ids.push(entry.name);
    }
  }
  return ids;
}
