#!/usr/bin/env node
/**
 * Converts a project's uploaded raster images to WebP in place and rewrites every
 * reference that points at them — page/collection/global JSON, theme.json, and the
 * media_files / media_sizes rows in SQLite — so the site keeps rendering afterwards.
 *
 * Usage:
 *   node scripts/optimize-project-media.mjs --project <folder>              # dry run
 *   node scripts/optimize-project-media.mjs --project <folder> --apply
 *   node scripts/optimize-project-media.mjs --project <folder> --apply --quality 82
 *
 * Flags:
 *   --apply              Actually write. Without it nothing is modified.
 *   --quality <n>        WebP quality, default 80.
 *   --sample <n>         Files to encode for the dry-run estimate, default 24.
 *   --include-favicons   Convert favicons too (skipped by default — older Safari
 *                        will not render a WebP favicon).
 *   --delete-originals   Remove the replaced files instead of parking them in
 *                        uploads/images/.pre-webp/.
 *
 * Stop the backend before --apply: it holds the SQLite handle and caches media rows,
 * so a concurrent run would serve stale paths until restart.
 *
 * Only image/png and image/jpeg are touched. SVG (sanitised markup), GIF (animation
 * frames) and existing WebP are left alone.
 */

import sharp from "sharp";
import Database from "better-sqlite3";
import { readFile, writeFile, readdir, stat, mkdir, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT, "data", "widgetizer.db");
const CONVERTIBLE = new Set(["image/png", "image/jpeg"]);
const ENCODE_CONCURRENCY = 8;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const PROJECT = opt("project");
const APPLY = flag("apply");
const QUALITY = Number(opt("quality", "80"));
const SAMPLE_SIZE = Number(opt("sample", "24"));
const INCLUDE_FAVICONS = flag("include-favicons");
const DELETE_ORIGINALS = flag("delete-originals");

if (!PROJECT) {
  console.error("Usage: node scripts/optimize-project-media.mjs --project <folder> [--apply] [--quality 80]");
  process.exit(1);
}
if (!Number.isInteger(QUALITY) || QUALITY < 1 || QUALITY > 100) {
  console.error(`--quality must be an integer 1-100 (got ${opt("quality")})`);
  process.exit(1);
}

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const webpName = (filename) => `${filename.slice(0, filename.length - path.extname(filename).length)}.webp`;

/** Runs `worker` over `items` at bounded concurrency, reporting progress to stderr. */
async function mapLimit(items, limit, worker, label) {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i], i);
        if (label && ++done % 50 === 0) process.stderr.write(`\r  ${label}: ${done}/${items.length}`);
      }
    }),
  );
  if (label) process.stderr.write(`\r  ${label}: ${items.length}/${items.length}\n`);
  return out;
}

/**
 * Upload paths belonging to a favicon, at any depth. Theme settings are arrays of
 * field objects, so the name lives in a sibling `id`/`name` rather than in the key
 * holding the path — both shapes are matched.
 */
function collectFavicons(node, found = new Set()) {
  if (!node || typeof node !== "object") return found;

  const identifier = [node.id, node.name, node.label].find((v) => typeof v === "string");
  if (identifier && /favicon/i.test(identifier) && typeof node.value === "string" && node.value.includes("/uploads/")) {
    found.add(node.value);
  }

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string" && /favicon/i.test(key) && value.includes("/uploads/")) found.add(value);
    else if (value && typeof value === "object") collectFavicons(value, found);
  }
  return found;
}

/** All *.json under `dir`, recursively. */
async function jsonFiles(dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await jsonFiles(full, acc);
    else if (entry.name.endsWith(".json")) acc.push(full);
  }
  return acc;
}

const db = new Database(DB_PATH, { readonly: !APPLY });
const project = db.prepare("SELECT id, folder_name, name FROM projects WHERE folder_name = ?").get(PROJECT);
if (!project) {
  console.error(`No project with folder_name "${PROJECT}".`);
  process.exit(1);
}

const projectDir = path.join(ROOT, "data", "projects", project.folder_name);
const imagesDir = path.join(projectDir, "uploads", "images");
if (!existsSync(imagesDir)) {
  console.error(`No uploads/images directory at ${imagesDir}`);
  process.exit(1);
}

console.log(`Project : ${project.name} (${project.folder_name})`);
console.log(`Mode    : ${APPLY ? "APPLY — files, JSON and database will be modified" : "dry run"}`);
console.log(`Target  : WebP q${QUALITY}\n`);

// theme.json holds the favicon; a WebP favicon silently fails on older Safari, so it
// stays PNG unless explicitly opted in.
const themeJsonPath = path.join(projectDir, "theme.json");
let favicons = new Set();
if (!INCLUDE_FAVICONS && existsSync(themeJsonPath)) {
  favicons = collectFavicons(JSON.parse(await readFile(themeJsonPath, "utf8")));
}

// ---------------------------------------------------------------------------
// Plan: one entry per file on disk that will be re-encoded. The database is the
// source of truth for what is referenced, so the plan is driven from it.
// ---------------------------------------------------------------------------
const mediaRows = db
  .prepare("SELECT id, filename, path, type, size FROM media_files WHERE project_id = ?")
  .all(project.id);
const sizeRows = db.prepare(
  "SELECT s.id, s.media_file_id, s.path FROM media_sizes s JOIN media_files m ON m.id = s.media_file_id WHERE m.project_id = ?",
).all(project.id);
const sizesByMedia = sizeRows.reduce((acc, r) => ((acc[r.media_file_id] ??= []).push(r), acc), {});

const plan = [];
const skipped = { type: 0, favicon: 0, missing: [], collision: [] };

for (const row of mediaRows) {
  if (!CONVERTIBLE.has(row.type)) {
    skipped.type++;
    continue;
  }
  if (favicons.has(row.path)) {
    skipped.favicon++;
    continue;
  }

  const entries = [
    { kind: "original", mediaId: row.id, oldPath: row.path, filename: row.filename },
    ...(sizesByMedia[row.id] ?? []).map((s) => ({
      kind: "variant",
      sizeId: s.id,
      oldPath: s.path,
      filename: path.basename(s.path),
    })),
  ];

  for (const entry of entries) {
    const src = path.join(imagesDir, entry.filename);
    if (!existsSync(src)) {
      skipped.missing.push(entry.filename);
      continue;
    }
    const newFilename = webpName(entry.filename);
    if (existsSync(path.join(imagesDir, newFilename))) {
      skipped.collision.push(newFilename);
      continue;
    }
    plan.push({
      ...entry,
      src,
      newFilename,
      newPath: `/uploads/images/${newFilename}`,
      oldBytes: (await stat(src)).size,
    });
  }
}

if (!plan.length) {
  console.log("Nothing to convert.");
  process.exit(0);
}

const planBytes = plan.reduce((a, e) => a + e.oldBytes, 0);
console.log(`Convertible : ${plan.length} files (${mb(planBytes)})`);
console.log(`  originals : ${plan.filter((e) => e.kind === "original").length}`);
console.log(`  variants  : ${plan.filter((e) => e.kind === "variant").length}`);
if (skipped.type) console.log(`Skipped     : ${skipped.type} non-PNG/JPEG (svg, gif, existing webp)`);
if (skipped.favicon) console.log(`Skipped     : ${skipped.favicon} favicon (pass --include-favicons to convert)`);
if (skipped.missing.length) console.log(`Missing     : ${skipped.missing.length} referenced files absent from disk`);
if (skipped.collision.length) console.log(`Collision   : ${skipped.collision.length} targets already exist — left untouched`);

// Files present on disk but not referenced by any database row. They are not
// converted (nothing points at them) but they are worth surfacing.
const onDisk = new Set((await readdir(imagesDir)).filter((f) => !f.startsWith(".")));
for (const e of plan) onDisk.delete(e.filename);
for (const row of mediaRows) onDisk.delete(row.filename);
for (const s of sizeRows) onDisk.delete(path.basename(s.path));
if (onDisk.size) console.log(`Untracked   : ${onDisk.size} files on disk with no database row — left untouched`);

// ---------------------------------------------------------------------------
// Dry run: encode a spread-out sample to report a measured (not guessed) ratio.
// ---------------------------------------------------------------------------
if (!APPLY) {
  const bySize = [...plan].sort((a, b) => b.oldBytes - a.oldBytes);
  const step = Math.max(1, Math.floor(bySize.length / SAMPLE_SIZE));
  const sample = Array.from({ length: Math.min(SAMPLE_SIZE, bySize.length) }, (_, i) => bySize[i * step]).filter(
    Boolean,
  );

  console.log(`\nEncoding ${sample.length}-file sample to measure the ratio...`);
  const encoded = await mapLimit(
    sample,
    ENCODE_CONCURRENCY,
    async (e) => (await sharp(e.src).webp({ quality: QUALITY }).toBuffer()).length,
  );

  const before = sample.reduce((a, e) => a + e.oldBytes, 0);
  const after = encoded.reduce((a, n) => a + n, 0);
  const ratio = after / before;

  console.log(`\nSample   : ${mb(before)} -> ${mb(after)}  (${(100 * (1 - ratio)).toFixed(1)}% smaller)`);
  console.log(`Projected: ${mb(planBytes)} -> ${mb(planBytes * ratio)} across all ${plan.length} files`);
  console.log(`           saves roughly ${mb(planBytes * (1 - ratio))}`);
  console.log(`\nRe-run with --apply to perform the conversion.`);
  db.close();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------
console.log(`\nEncoding ${plan.length} files...`);
const results = await mapLimit(
  plan,
  ENCODE_CONCURRENCY,
  async (e) => {
    const buf = await sharp(e.src).webp({ quality: QUALITY }).toBuffer();
    await writeFile(path.join(imagesDir, e.newFilename), buf);
    return { ...e, newBytes: buf.length };
  },
  "encoded",
);

// Rewrite references. Paths are matched as whole strings including the extension,
// so "foo.png" cannot collide with "foo-medium.png" or "foo1.png".
const pathMap = new Map(results.map((e) => [e.oldPath, e.newPath]));
const targets = await jsonFiles(projectDir);
let filesTouched = 0;
let refsRewritten = 0;

for (const file of targets) {
  const before = await readFile(file, "utf8");
  let after = before;
  for (const [oldPath, newPath] of pathMap) {
    if (!after.includes(oldPath)) continue;
    refsRewritten += after.split(oldPath).length - 1;
    after = after.split(oldPath).join(newPath);
  }
  if (after !== before) {
    await writeFile(file, after);
    filesTouched++;
  }
}
console.log(`  rewrote ${refsRewritten} references across ${filesTouched} JSON files`);

// Database, in a single transaction so a failure mid-way leaves nothing half-updated.
const updateMedia = db.prepare("UPDATE media_files SET filename = ?, path = ?, type = 'image/webp', size = ? WHERE id = ?");
const updateSize = db.prepare("UPDATE media_sizes SET path = ? WHERE id = ?");
db.transaction((entries) => {
  for (const e of entries) {
    if (e.kind === "original") updateMedia.run(e.newFilename, e.newPath, e.newBytes, e.mediaId);
    else updateSize.run(e.newPath, e.sizeId);
  }
})(results);
console.log(`  updated ${results.filter((e) => e.kind === "original").length} media_files and ${results.filter((e) => e.kind === "variant").length} media_sizes rows`);

// Verify before discarding anything: no stale reference may survive, and every
// image path still mentioned in the JSON must resolve on disk.
let stale = 0;
const dangling = new Set();
for (const file of targets) {
  const text = await readFile(file, "utf8");
  for (const oldPath of pathMap.keys()) if (text.includes(oldPath)) stale++;
  for (const ref of text.match(/\/uploads\/images\/[^"'\\ )]+/g) ?? []) {
    if (!existsSync(path.join(imagesDir, path.basename(ref)))) dangling.add(ref);
  }
}
if (stale || dangling.size) {
  console.error(`\nVERIFICATION FAILED — originals kept in place.`);
  if (stale) console.error(`  ${stale} stale references remain`);
  if (dangling.size) console.error(`  ${dangling.size} references point at missing files:`);
  [...dangling].slice(0, 10).forEach((d) => console.error(`    ${d}`));
  db.close();
  process.exit(1);
}
console.log(`  verified: no stale references, all image paths resolve`);

// Park the replaced files rather than deleting, so the run stays reversible.
if (DELETE_ORIGINALS) {
  for (const e of results) await unlink(e.src);
  console.log(`  deleted ${results.length} replaced files`);
} else {
  const parkDir = path.join(imagesDir, ".pre-webp");
  await mkdir(parkDir, { recursive: true });
  for (const e of results) await rename(e.src, path.join(parkDir, e.filename));
  console.log(`  moved ${results.length} replaced files to uploads/images/.pre-webp/`);
}

const oldBytes = results.reduce((a, e) => a + e.oldBytes, 0);
const newBytes = results.reduce((a, e) => a + e.newBytes, 0);
console.log(`\nDone: ${mb(oldBytes)} -> ${mb(newBytes)}  (${(100 * (1 - newBytes / oldBytes)).toFixed(1)}% smaller)`);
db.close();
