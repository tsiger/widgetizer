/**
 * Package a finished project's images into a theme preset's starter media, so
 * new projects created from that preset open with real photography instead of
 * placeholders.
 *
 * Image metadata (alt/title/caption/sizes) lives only in SQLite, so this reads
 * the project's media records from the DB and copies the image binaries from
 * disk, then writes into the SEED theme dir (themes/, the git-tracked source):
 *
 *   themes/<theme>/presets/<preset>/media/
 *     images/        # all the project's image binaries (originals + variants)
 *     manifest.json  # { files: [...] } — consumed at project creation by
 *                    # seedPresetMedia (server/controllers/projectController.js)
 *
 * Usage:
 *   node scripts/pack-preset-media.js --project <folder> [--theme arch] [--preset <id>]
 *   npm run preset:media -- --project brewline
 *
 * --preset defaults to the project folder name; --theme defaults to "arch".
 */
import path from "path";
import fs from "fs-extra";
import { THEMES_SEED_DIR, getProjectImagesDir } from "../server/config.js";
import { getDb } from "../server/db/index.js";
import { getMediaFiles } from "../server/db/repositories/mediaRepository.js";

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

async function main() {
  const { project, theme = "arch", preset } = parseArgs(process.argv);
  if (!project) {
    fail("Usage: node scripts/pack-preset-media.js --project <folder> [--theme arch] [--preset <id>]");
  }
  const presetId = preset || project;

  // Resolve the project's DB id from its folder name.
  const db = getDb();
  const row = db.prepare("SELECT id FROM projects WHERE folder_name = ?").get(project);
  if (!row) fail(`No project found with folder name "${project}".`);

  const { files } = getMediaFiles(row.id);
  if (files.length === 0) fail(`Project "${project}" has no media records — nothing to package.`);

  const srcImagesDir = getProjectImagesDir(project);
  if (!(await fs.pathExists(srcImagesDir))) fail(`Source images dir not found: ${srcImagesDir}`);

  const presetDir = path.join(THEMES_SEED_DIR, theme, "presets", presetId);
  if (!(await fs.pathExists(presetDir))) fail(`Preset not found: themes/${theme}/presets/${presetId}`);

  const mediaDir = path.join(presetDir, "media");
  const destImagesDir = path.join(mediaDir, "images");

  // Mirror the project's image binaries into the preset (clean slate each run so
  // removed images don't linger).
  await fs.emptyDir(destImagesDir);
  await fs.copy(srcImagesDir, destImagesDir);

  // Build the manifest from the DB records. Drop project-specific fields
  // (id/uploaded/usedIn) — seedPresetMedia assigns fresh, project-scoped values.
  const manifest = {
    files: files.map((file) => ({
      filename: file.filename,
      originalName: file.originalName,
      type: file.type,
      size: file.size,
      path: file.path,
      width: file.width,
      height: file.height,
      alt: file.metadata?.alt || "",
      title: file.metadata?.title || "",
      caption: file.metadata?.caption || "",
      sizes: file.sizes || {},
    })),
  };
  await fs.writeFile(path.join(mediaDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const copiedCount = (await fs.readdir(destImagesDir)).length;
  console.log(
    `✓ Packaged ${manifest.files.length} image(s) (${copiedCount} files incl. variants) ` +
      `from project "${project}" → themes/${theme}/presets/${presetId}/media/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
