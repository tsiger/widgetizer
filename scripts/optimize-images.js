import dotenv from "dotenv";
import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env") });

const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tiff", ".avif"]);

function usage() {
  console.log(`
Usage: node scripts/optimize-images.js <input-folder> <output-folder>

  input-folder    Directory containing source images
  output-folder   Directory to write optimized .webp files (created if missing)

Converts all supported images (jpg, jpeg, png, webp, tiff, avif) to
lossless WebP. Skips files that already exist in the output folder.
`);
  process.exit(1);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDuration(ms) {
  const secs = Math.round(ms / 1000);
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

async function run() {
  const [inputDir, outputDir] = process.argv.slice(2);
  if (!inputDir || !outputDir) usage();

  const resolvedInput = path.resolve(ROOT, inputDir);
  const resolvedOutput = path.resolve(ROOT, outputDir);

  if (!existsSync(resolvedInput)) {
    console.error(`Input folder does not exist: ${resolvedInput}`);
    process.exit(1);
  }

  await mkdir(resolvedOutput, { recursive: true });

  const allFiles = await readdir(resolvedInput);
  const images = allFiles.filter((f) => SUPPORTED_EXTS.has(path.extname(f).toLowerCase()));

  if (images.length === 0) {
    console.error("No supported images found in input folder.");
    process.exit(1);
  }

  console.log(`\nInput:  ${resolvedInput}`);
  console.log(`Output: ${resolvedOutput}`);
  console.log(`Images: ${images.length}\n`);

  const totalStart = Date.now();
  let converted = 0;
  let skipped = 0;
  let totalInputBytes = 0;
  let totalOutputBytes = 0;

  for (const [i, file] of images.entries()) {
    const outName = path.basename(file, path.extname(file)) + ".webp";
    const src = path.join(resolvedInput, file);
    const dest = path.join(resolvedOutput, outName);

    if (existsSync(dest)) {
      console.log(`  [${i + 1}/${images.length}] ⏭  ${file} → ${outName} (exists, skipping)`);
      skipped++;
      continue;
    }

    const inputBytes = (await stat(src)).size;

    await sharp(src)
      .webp({ quality: 90, effort: 6 })
      .toFile(dest);

    const outputBytes = (await stat(dest)).size;
    totalInputBytes += inputBytes;
    totalOutputBytes += outputBytes;

    const ratio = ((1 - outputBytes / inputBytes) * 100).toFixed(1);
    console.log(
      `  [${i + 1}/${images.length}] ✅ ${file} → ${outName}  ` +
        `${formatSize(inputBytes)} → ${formatSize(outputBytes)} (−${ratio}%)`
    );
    converted++;
  }

  const totalElapsed = formatDuration(Date.now() - totalStart);
  console.log(`\nDone in ${totalElapsed}: ${converted} converted, ${skipped} skipped.`);
  if (converted > 0) {
    const totalRatio = ((1 - totalOutputBytes / totalInputBytes) * 100).toFixed(1);
    console.log(
      `Total: ${formatSize(totalInputBytes)} → ${formatSize(totalOutputBytes)} (−${totalRatio}%)`
    );
  }
}

run();
