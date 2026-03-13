/**
 * Validates that all locale files have the same keys as en.json.
 * Exits with error code 1 if any keys are missing.
 *
 * Usage: node scripts/validate-locales.js
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const localesDir = join(__dirname, "..", "src", "locales");

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const files = readdirSync(localesDir).filter((f) => f.endsWith(".json"));
const enFile = join(localesDir, "en.json");
const en = JSON.parse(readFileSync(enFile, "utf-8"));
const enKeys = new Set(flattenKeys(en));

let hasErrors = false;

for (const file of files) {
  if (file === "en.json") continue;

  const lang = basename(file, ".json");
  const data = JSON.parse(readFileSync(join(localesDir, file), "utf-8"));
  const langKeys = new Set(flattenKeys(data));

  const missing = [...enKeys].filter((k) => !langKeys.has(k));
  const extra = [...langKeys].filter((k) => !enKeys.has(k));

  if (missing.length > 0) {
    hasErrors = true;
    console.error(`\n[${lang}] Missing ${missing.length} key(s):`);
    for (const k of missing) {
      console.error(`  - ${k}`);
    }
  }

  if (extra.length > 0) {
    console.warn(`\n[${lang}] Extra ${extra.length} key(s) (not in en.json):`);
    for (const k of extra) {
      console.warn(`  + ${k}`);
    }
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`[${lang}] OK — all ${enKeys.size} keys present`);
  }
}

if (hasErrors) {
  console.error("\nValidation FAILED — some locales have missing keys.");
  process.exit(1);
} else {
  console.log(`\nAll locales validated — ${enKeys.size} keys each.`);
}
