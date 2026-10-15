/**
 * TEST TOOL: build themes/<theme>/preset-media-optim/ — a drop-in copy of
 * preset-media/ with further-compressed images — for visual A/B inspection
 * before deciding whether to replace the originals.
 *
 * The source images are already lossy WebP q90 (see optimize-images.js), so
 * this is a second lossy pass at a lower quality: real savings, slight
 * generational loss. Judge with your eyes, not the byte counts.
 *
 * - Filenames, dimensions, and folder layout stay identical (drop-in swap).
 * - .webp → lossy WebP (--quality, default 80). .jpg → mozjpeg (same quality).
 *   .png → lossless recompress (safe for logos/graphics).
 * - If a re-encode comes out LARGER than the original, the original is kept.
 * - manifest.json is copied with each file's `size` updated to the new bytes.
 *
 * Usage:
 *   node scripts/optimize-preset-media.js [--theme arch] [--quality 80]
 *
 * Output: themes/<theme>/preset-media-optim/ (recreated fresh each run).
 */
import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { theme: "arch", quality: 80 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--theme") args.theme = argv[++i];
    else if (argv[i] === "--quality") args.quality = Number(argv[++i]);
  }
  return args;
}

function formatSize(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

async function optimizeFile(src, dest, quality) {
  const ext = path.extname(src).toLowerCase();
  const image = sharp(src);

  if (ext === ".webp") {
    await image.webp({ quality, effort: 6, smartSubsample: true }).toFile(dest);
  } else if (ext === ".jpg" || ext === ".jpeg") {
    await image.jpeg({ quality, mozjpeg: true }).toFile(dest);
  } else if (ext === ".png") {
    // Lossless recompress only — PNGs here are logos/graphics where lossy
    // artifacts would be visible.
    await image.png({ compressionLevel: 9, effort: 10 }).toFile(dest);
  } else {
    await fs.copy(src, dest);
    return { inBytes: (await fs.stat(src)).size, outBytes: (await fs.stat(dest)).size, kept: false };
  }

  const inBytes = (await fs.stat(src)).size;
  let outBytes = (await fs.stat(dest)).size;
  // Never ship a "optimized" file that got bigger.
  if (outBytes >= inBytes) {
    await fs.copy(src, dest, { overwrite: true });
    outBytes = inBytes;
    return { inBytes, outBytes, kept: true };
  }
  return { inBytes, outBytes, kept: false };
}

async function main() {
  const { theme, quality } = parseArgs(process.argv);
  const srcRoot = path.join(ROOT, "themes", theme, "preset-media");
  const destRoot = path.join(ROOT, "themes", theme, "preset-media-optim");

  if (!(await fs.pathExists(srcRoot))) {
    console.error(`✗ Not found: ${srcRoot}`);
    process.exit(1);
  }

  await fs.emptyDir(destRoot);
  console.log(`Optimizing ${srcRoot} → ${destRoot} (webp/jpg quality ${quality})\n`);

  const presets = (await fs.readdir(srcRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let grandIn = 0;
  let grandOut = 0;
  let kept = 0;

  for (const preset of presets) {
    const imagesDir = path.join(srcRoot, preset, "images");
    const destImagesDir = path.join(destRoot, preset, "images");
    await fs.ensureDir(destImagesDir);

    let presetIn = 0;
    let presetOut = 0;
    const newSizes = new Map(); // filename → optimized byte size

    if (await fs.pathExists(imagesDir)) {
      for (const file of (await fs.readdir(imagesDir)).sort()) {
        const res = await optimizeFile(path.join(imagesDir, file), path.join(destImagesDir, file), quality);
        presetIn += res.inBytes;
        presetOut += res.outBytes;
        if (res.kept) kept++;
        newSizes.set(file, res.outBytes);
      }
    }

    // Manifest rides along with per-file `size` refreshed, so a promotion to
    // preset-media/ is drop-in.
    const manifestPath = path.join(srcRoot, preset, "manifest.json");
    if (await fs.pathExists(manifestPath)) {
      const manifest = await fs.readJson(manifestPath);
      for (const entry of manifest.files || []) {
        const optimized = newSizes.get(entry.filename);
        if (optimized !== undefined) entry.size = optimized;
      }
      await fs.writeFile(path.join(destRoot, preset, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    }

    grandIn += presetIn;
    grandOut += presetOut;
    const pct = presetIn ? ((1 - presetOut / presetIn) * 100).toFixed(1) : "0.0";
    console.log(`  ${preset.padEnd(14)} ${formatSize(presetIn).padStart(9)} → ${formatSize(presetOut).padStart(9)}  (−${pct}%)`);
  }

  const pct = grandIn ? ((1 - grandOut / grandIn) * 100).toFixed(1) : "0.0";
  console.log(`\nTotal: ${formatSize(grandIn)} → ${formatSize(grandOut)} (−${pct}%), ${kept} file(s) kept as originals`);
  console.log(`\nInspect visually, e.g. compare themes/${theme}/preset-media{,-optim}/<preset>/images/.`);
  console.log(`preset-media-optim/ is a scratch output — delete it (or promote it) when done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
