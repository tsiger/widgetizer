/**
 * Validates theme locale files for completeness and correctness.
 *
 * Checks:
 *   1. Every tTheme: key in widget schemas + theme.json exists in en.json
 *   2. en.json contains no extra keys that aren't referenced by any schema
 *   3. Every non-English locale has the same keys as en.json (no missing, no extra)
 *
 * Reads from latest/ snapshot if it exists, otherwise falls back to
 * the base theme directory.
 *
 * Usage:
 *   node scripts/validate-theme-locales.js                # all themes
 *   node scripts/validate-theme-locales.js arch            # specific theme
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  flattenKeys,
  extractThemeKeys,
  findSchemaFiles,
} from "./validate-theme-locales-helpers.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");

/** Resolve the effective theme directory: latest/ if it exists, otherwise base. */
function resolveThemeDir(themeName) {
  const dataLatest = join(rootDir, "data", "themes", themeName, "latest");
  if (existsSync(dataLatest)) return { dir: dataLatest, source: "latest/" };

  const dataBase = join(rootDir, "data", "themes", themeName);
  if (existsSync(join(dataBase, "theme.json")))
    return { dir: dataBase, source: "data/themes/" };

  const seedBase = join(rootDir, "themes", themeName);
  if (existsSync(join(seedBase, "theme.json")))
    return { dir: seedBase, source: "themes/" };

  return null;
}

// ── Validation ────────────────────────────────────────────────────────

function validateTheme(themeName) {
  const resolved = resolveThemeDir(themeName);
  if (!resolved) {
    console.error(`Theme "${themeName}" not found.`);
    return false;
  }

  const { dir, source } = resolved;
  console.log(`\n━━ ${themeName} (${source}${themeName}) ━━`);

  // Collect all tTheme: keys from schemas + theme.json
  const schemaKeys = [];

  const widgetsDir = join(dir, "widgets");
  for (const schemaPath of findSchemaFiles(widgetsDir)) {
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    schemaKeys.push(...extractThemeKeys(schema));
  }

  const themeJsonPath = join(dir, "theme.json");
  if (existsSync(themeJsonPath)) {
    const themeJson = JSON.parse(readFileSync(themeJsonPath, "utf-8"));
    schemaKeys.push(...extractThemeKeys(themeJson));

    // Section names are resolved dynamically in the frontend via
    // tTheme("tTheme:global.<group>.name"), so add them explicitly.
    if (themeJson.settings?.global) {
      for (const groupKey of Object.keys(themeJson.settings.global)) {
        schemaKeys.push(`global.${groupKey}.name`);
      }
    }
  }

  const uniqueSchemaKeys = [...new Set(schemaKeys)];
  const schemaKeySet = new Set(uniqueSchemaKeys);

  // Load en.json
  const localesDir = join(dir, "locales");
  if (!existsSync(localesDir)) {
    console.error(`  No locales/ directory found.`);
    return false;
  }

  const enPath = join(localesDir, "en.json");
  if (!existsSync(enPath)) {
    console.error(`  No en.json found.`);
    return false;
  }

  const en = JSON.parse(readFileSync(enPath, "utf-8"));
  const enKeys = new Set(flattenKeys(en));

  let hasErrors = false;

  // ── Check 1: Every tTheme: key exists in en.json ──────────────────

  function getNested(obj, keyPath) {
    const segs = keyPath.split(".");
    let val = obj;
    for (const s of segs) {
      if (val == null || typeof val !== "object") return undefined;
      val = val[s];
    }
    return val;
  }

  const missingFromEn = uniqueSchemaKeys.filter(
    (k) => getNested(en, k) === undefined,
  );
  if (missingFromEn.length > 0) {
    hasErrors = true;
    console.error(
      `  ✗ ${missingFromEn.length} tTheme: key(s) missing from en.json:`,
    );
    for (const k of missingFromEn) {
      console.error(`    - ${k}`);
    }
  } else {
    console.log(
      `  ✓ All ${uniqueSchemaKeys.length} tTheme: keys present in en.json`,
    );
  }

  // ── Check 1b: en.json has no extra keys absent from schemas ────────

  const extraInEn = [...enKeys].filter((k) => !schemaKeySet.has(k));
  if (extraInEn.length > 0) {
    hasErrors = true;
    console.error(
      `  ✗ ${extraInEn.length} extra key(s) in en.json not referenced by any schema:`,
    );
    for (const k of extraInEn) {
      console.error(`    + ${k}`);
    }
  } else {
    console.log(`  ✓ en.json has no orphaned keys`);
  }

  // ── Check 2: Non-English locales match en.json keys ───────────────

  const localeFiles = readdirSync(localesDir).filter(
    (f) => f.endsWith(".json") && f !== "en.json",
  );

  for (const file of localeFiles) {
    const lang = basename(file, ".json");
    const data = JSON.parse(readFileSync(join(localesDir, file), "utf-8"));
    const langKeys = new Set(flattenKeys(data));

    const missing = [...enKeys].filter((k) => !langKeys.has(k));
    const extra = [...langKeys].filter((k) => !enKeys.has(k));

    if (missing.length > 0) {
      hasErrors = true;
      console.error(`  ✗ [${lang}] Missing ${missing.length} key(s):`);
      for (const k of missing) {
        console.error(`    - ${k}`);
      }
    }

    if (extra.length > 0) {
      console.warn(`  ⚠ [${lang}] Extra ${extra.length} key(s):`);
      for (const k of extra) {
        console.warn(`    + ${k}`);
      }
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✓ [${lang}] OK — all ${enKeys.size} keys present`);
    }
  }

  return !hasErrors;
}

// ── Main ──────────────────────────────────────────────────────────────

const requestedTheme = process.argv[2];

if (requestedTheme) {
  // Validate a single theme
  const ok = validateTheme(requestedTheme);
  process.exit(ok ? 0 : 1);
} else {
  // Validate all themes found in themes/ directory
  const themesDir = join(rootDir, "themes");
  const themes = readdirSync(themesDir).filter((d) =>
    existsSync(join(themesDir, d, "theme.json")),
  );

  if (themes.length === 0) {
    console.log("No themes found.");
    process.exit(0);
  }

  let allOk = true;
  for (const theme of themes) {
    if (!validateTheme(theme)) allOk = false;
  }

  console.log(
    allOk
      ? "\n✓ All theme locales validated."
      : "\n✗ Some theme locales have issues.",
  );
  process.exit(allOk ? 0 : 1);
}
