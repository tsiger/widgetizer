/**
 * Sync a finished demo project's pages into a theme preset's templates/ — the
 * mirror of pack-preset-media.js. The media tool ships the image binaries; this
 * ships the pages that *reference* them. Without it a preset's templates have
 * empty image fields, so new projects render placeholders and the seeded images
 * show as "unused".
 *
 * Project pages and preset templates share the same shape; the only difference
 * is pages carry a per-instance `uuid` (regenerated at project creation), which
 * is stripped here. The demo project is the source of truth, so the preset's
 * templates/ are mirrored from it wholesale (clean slate each run).
 *
 * Usage:
 *   node scripts/sync-preset-templates.js --project <folder> --preset <id> [--theme arch]
 *   npm run preset:templates -- --project brewline-copy --preset brewline
 *
 * --theme defaults to "arch"; --preset defaults to the project folder name.
 */
import path from "path";
import fs from "fs-extra";
import { THEMES_SEED_DIR, getProjectPagesDir, getProjectMenusDir } from "../packages/builder-server/src/config.js";
import { stripRichtextLinkRefs } from "../packages/core/src/utils/richtextLinks.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--project") args.project = argv[++i];
    else if (flag === "--theme") args.theme = argv[++i];
    else if (flag === "--preset") args.preset = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function walkJson(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkJson(full)));
    else if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

// Internal-link references are re-derived from the link's href (slug) at project
// creation (enrichNewProjectReferences + the post-seed richtext enrichment). A demo's
// per-project refs are stale in a preset, so strip them here, just like the page's own
// uuid: structured-link `pageUuid`, and richtext anchors' `data-page-uuid` /
// `data-collection-item-uuid` attrs inside richtext string values.
function stripStaleLinkRefs(node) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      if (typeof v === "string") node[i] = stripRichtextLinkRefs(v);
      else stripStaleLinkRefs(v);
    });
  } else if (node && typeof node === "object") {
    if ("href" in node && "pageUuid" in node) delete node.pageUuid;
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (typeof v === "string") node[key] = stripRichtextLinkRefs(v);
      else stripStaleLinkRefs(v);
    }
  }
}

// Menu settings (header nav, footer menu, etc.) must reference a menu by its id
// (e.g. "main-menu"), not its uuid: enrichNewProjectReferences remaps the id to
// the project's freshly-generated menu uuid at creation. A demo's per-project
// menu uuid is stale in a preset, so convert any baked-in menu uuid back to its
// id here, using the demo project's own menu uuid->id map. Returns the count.
function convertMenuRefsToIds(node, uuidToId) {
  let n = 0;
  if (Array.isArray(node)) {
    for (const v of node) n += convertMenuRefsToIds(v, uuidToId);
  } else if (node && typeof node === "object") {
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (typeof v === "string" && uuidToId.has(v)) {
        node[key] = uuidToId.get(v);
        n += 1;
      } else {
        n += convertMenuRefsToIds(v, uuidToId);
      }
    }
  }
  return n;
}

async function main() {
  const { project, theme = "arch", preset } = parseArgs(process.argv);
  if (!project) fail("Usage: node scripts/sync-preset-templates.js --project <folder> --preset <id> [--theme arch]");
  const presetId = preset || project;

  const pagesDir = getProjectPagesDir(project);
  if (!(await fs.pathExists(pagesDir))) fail(`Project pages not found: ${pagesDir}`);

  const presetDir = path.join(THEMES_SEED_DIR, theme, "presets", presetId);
  if (!(await fs.pathExists(presetDir))) fail(`Preset not found: themes/${theme}/presets/${presetId}`);

  const templatesDir = path.join(presetDir, "templates");
  const pageFiles = await walkJson(pagesDir);
  if (!pageFiles.length) fail(`Project "${project}" has no pages to sync.`);

  // Mirror the demo's pages into the preset templates (clean slate so removed
  // pages don't linger).
  await fs.emptyDir(templatesDir);

  // Map the demo project's menu uuids -> ids so menu settings ship referencing
  // menus by id (see convertMenuRefsToIds).
  const menuUuidToId = new Map();
  const menusDir = getProjectMenusDir(project);
  if (await fs.pathExists(menusDir)) {
    for (const entry of await fs.readdir(menusDir)) {
      if (!entry.endsWith(".json")) continue;
      const menu = await fs.readJSON(path.join(menusDir, entry));
      if (menu.uuid && menu.id) menuUuidToId.set(menu.uuid, menu.id);
    }
  }

  let imageRefs = 0;
  let menuRefs = 0;
  for (const pageFile of pageFiles) {
    const rel = path.relative(pagesDir, pageFile);
    const page = await fs.readJSON(pageFile);
    delete page.uuid; // per-instance id, regenerated when a project is created
    stripStaleLinkRefs(page); // structured pageUuid + richtext data-*-uuid are re-derived from href at creation
    menuRefs += convertMenuRefsToIds(page, menuUuidToId); // menu uuid -> id; enrichment remaps at creation

    const targetPath = path.join(templatesDir, rel);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, `${JSON.stringify(page, null, 2)}\n`);

    imageRefs += (JSON.stringify(page).match(/\/uploads\/images\//g) || []).length;
  }

  console.log(
    `✓ Synced ${pageFiles.length} page(s) from project "${project}" → ` +
      `themes/${theme}/presets/${presetId}/templates/ (${imageRefs} image references, ${menuRefs} menu refs normalized to ids)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
