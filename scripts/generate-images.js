import dotenv from "dotenv";
import { fal } from "@fal-ai/client";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env") });

const CONCURRENCY = 10;
const MODEL = "fal-ai/flux-2-pro";
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [2000, 5000, 10000];

function usage() {
  console.log(`
Usage: node scripts/generate-images.js <plan.json> <output-folder>

  plan.json       JSON file with an array of image specs (see docs-llms/preset-plans/)
  output-folder   Directory to write generated images into (created if missing)

Each entry in the JSON array must have:
  file    – output filename (e.g. "hero.jpg")
  width   – desired width in pixels
  height  – desired height in pixels
  prompt  – text prompt for FLUX 2 Pro

Environment:
  FAL_KEY – fal.ai API key (set in .env or export directly)
`);
  process.exit(1);
}

function formatDuration(ms) {
  const secs = Math.round(ms / 1000);
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Safe JSON for logging (avoid huge payloads). */
function tryJson(value, maxLen = 2000) {
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return String(value);
  }
}

/**
 * Collect everything useful from thrown values (fetch, fal client, Node).
 */
function formatErrorDetails(err, stage, file) {
  const lines = [`  ❌ ${file}  [${stage}]`];
  if (err == null) {
    lines.push("  (null/undefined error)");
    return lines.join("\n");
  }
  const e =
    err instanceof Error
      ? err
      : typeof err === "object" && err !== null && "message" in err
        ? err
        : new Error(String(err));

  lines.push(`  message: ${e.message}`);
  if (e.name && e.name !== "Error") lines.push(`  name: ${e.name}`);
  if ("code" in e && e.code) lines.push(`  code: ${e.code}`);

  // Node fetch / HTTP
  if ("status" in e && e.status != null) lines.push(`  status: ${e.status}`);
  if ("statusText" in e && e.statusText) lines.push(`  statusText: ${e.statusText}`);

  // fal client often wraps API errors
  for (const key of ["body", "detail", "detailMessage", "response"]) {
    if (key in e && e[key] != null) {
      lines.push(`  ${key}: ${tryJson(e[key])}`);
    }
  }

  let c = e.cause;
  let depth = 0;
  while (c != null && depth < 5) {
    const msg = c instanceof Error ? c.message : tryJson(c);
    lines.push(`  cause[${depth}]: ${msg}`);
    c = c instanceof Error ? c.cause : null;
    depth++;
  }

  if (e.stack) {
    const stackLines = e.stack.split("\n").slice(0, 6).join("\n    ");
    lines.push(`  stack (first lines):\n    ${stackLines}`);
  }

  return lines.join("\n");
}

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Download failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.statusText = res.statusText;
    throw err;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
}

async function generateOne(entry, outputDir, index, total) {
  const { file, width, height, prompt } = entry;
  const ext = path.extname(file).replace(".", "").toLowerCase();
  const outputFormat = ext === "png" ? "png" : "jpeg";
  const dest = path.join(outputDir, file);

  if (existsSync(dest)) {
    console.log(`  [${index + 1}/${total}] ⏭  ${file} (already exists, skipping)`);
    return { file, skipped: true };
  }

  console.log(`  [${index + 1}/${total}] 🎨 ${file} (${width}×${height}) ...`);
  const start = Date.now();

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      let result;
      try {
        result = await fal.subscribe(MODEL, {
          input: {
            prompt,
            image_size: { width, height },
            output_format: outputFormat,
          },
          logs: false,
        });
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        wrapped.stage = "fal.subscribe";
        wrapped.file = file;
        throw wrapped;
      }

      const imageUrl = result?.data?.images?.[0]?.url;
      if (!imageUrl) {
        const err = new Error(
          `No image URL in fal response: ${tryJson(result?.data, 500)}`
        );
        err.stage = "fal.response";
        err.file = file;
        throw err;
      }

      try {
        await downloadImage(imageUrl, dest);
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        wrapped.stage = "download";
        wrapped.file = file;
        wrapped.imageUrl = imageUrl;
        throw wrapped;
      }

      const elapsed = formatDuration(Date.now() - start);
      if (attempt > 1) {
        console.log(`  [${index + 1}/${total}] ✅ ${file} (${elapsed}) after ${attempt} attempts`);
      } else {
        console.log(`  [${index + 1}/${total}] ✅ ${file} (${elapsed})`);
      }
      return { file, skipped: false, elapsed };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (!lastErr.file) lastErr.file = file;
      const stage = lastErr.stage || "unknown";
      console.error(formatErrorDetails(lastErr, stage, file));
      if (attempt < MAX_ATTEMPTS) {
        const wait = RETRY_BACKOFF_MS[attempt - 1] ?? 10000;
        console.error(`  ↳ retry ${attempt + 1}/${MAX_ATTEMPTS} in ${wait / 1000}s…`);
        await sleep(wait);
      }
    }
  }

  if (lastErr) {
    lastErr.file = file;
    throw lastErr;
  }
  throw new Error(`generateOne: exhausted retries for ${file}`);
}

async function run() {
  const [planPath, outputDir] = process.argv.slice(2);
  if (!planPath || !outputDir) usage();

  if (!process.env.FAL_KEY) {
    console.error("Error: FAL_KEY is not set. Add it to .env or export it.");
    process.exit(1);
  }

  fal.config({ credentials: process.env.FAL_KEY });

  const resolvedPlan = path.resolve(ROOT, planPath);
  const resolvedOutput = path.resolve(ROOT, outputDir);

  let entries;
  try {
    const raw = await readFile(resolvedPlan, "utf-8");
    const parsed = JSON.parse(raw);
    entries = Array.isArray(parsed) ? parsed : parsed.images;
  } catch (err) {
    console.error(`Error reading plan: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    console.error('Plan file must contain a JSON array or an object with an "images" array.');
    process.exit(1);
  }

  for (const [i, entry] of entries.entries()) {
    for (const key of ["file", "width", "height", "prompt"]) {
      if (!entry[key]) {
        console.error(`Entry ${i + 1} is missing required field "${key}".`);
        process.exit(1);
      }
    }
  }

  await mkdir(resolvedOutput, { recursive: true });

  console.log(`\nPlan:   ${resolvedPlan}`);
  console.log(`Output: ${resolvedOutput}`);
  console.log(`Images: ${entries.length} (concurrency: ${CONCURRENCY}, retries: ${MAX_ATTEMPTS - 1})\n`);

  const totalStart = Date.now();
  let generated = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((entry, j) => generateOne(entry, resolvedOutput, i + j, entries.length))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.skipped) skipped++;
        else generated++;
      } else {
        const reason = result.reason;
        errors.push(reason);
        const fname = reason?.file ?? "(unknown file)";
        console.error(`  ❌ ${fname} — failed after ${MAX_ATTEMPTS} attempts (details above)`);
      }
    }
  }

  const totalElapsed = formatDuration(Date.now() - totalStart);
  console.log(`\nDone in ${totalElapsed}: ${generated} generated, ${skipped} skipped, ${errors.length} failed.`);

  if (errors.length > 0) process.exit(1);
}

run();
