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
import { THEMES_SEED_DIR, getProjectPagesDir } from "../packages/builder-server/src/config.js";

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

  let imageRefs = 0;
  for (const pageFile of pageFiles) {
    const rel = path.relative(pagesDir, pageFile);
    const page = await fs.readJSON(pageFile);
    delete page.uuid; // per-instance id, regenerated when a project is created

    const targetPath = path.join(templatesDir, rel);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, `${JSON.stringify(page, null, 2)}\n`);

    imageRefs += (JSON.stringify(page).match(/\/uploads\/images\//g) || []).length;
  }

  console.log(
    `✓ Synced ${pageFiles.length} page(s) from project "${project}" → ` +
      `themes/${theme}/presets/${presetId}/templates/ (${imageRefs} image references)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
