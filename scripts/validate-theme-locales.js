/**
 * Validates shared core-widget locales and theme-owned locales separately.
 *
 * Ownership model:
 *   1. Core widget tTheme: keys live in src/core/widgets/locales/
 *   2. Theme widget + theme.json tTheme: keys live in each theme's locales/
 *   3. Theme locale APIs merge core + theme locales at runtime
 *
 * Usage:
 *   node scripts/validate-theme-locales.js
 *   node scripts/validate-theme-locales.js arch
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
const coreWidgetsDir = join(rootDir, "src", "core", "widgets");
const coreLocalesDir = join(coreWidgetsDir, "locales");

/** Resolve the effective theme directory, preferring source themes during local dev. */
function resolveThemeDir(themeName) {
  const seedBase = join(rootDir, "themes", themeName);
  if (existsSync(join(seedBase, "theme.json")))
    return { dir: seedBase, source: "themes/" };

  const dataLatest = join(rootDir, "data", "themes", themeName, "latest");
  if (existsSync(dataLatest)) return { dir: dataLatest, source: "latest/" };

  const dataBase = join(rootDir, "data", "themes", themeName);
  if (existsSync(join(dataBase, "theme.json")))
    return { dir: dataBase, source: "data/themes/" };

  return null;
}

function getNested(obj, keyPath) {
  const segs = keyPath.split(".");
  let val = obj;
  for (const s of segs) {
    if (val == null || typeof val !== "object") return undefined;
    val = val[s];
  }
  return val;
}

function collectSchemaKeysFromDir(dir) {
  const schemaKeys = [];
  if (!existsSync(dir)) return schemaKeys;

  for (const schemaPath of findSchemaFiles(dir)) {
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    schemaKeys.push(...extractThemeKeys(schema));
  }

  return schemaKeys;
}

function validateLocaleSet(label, localesDir, schemaKeys, ignoredExtraKeys = new Set()) {
  if (!existsSync(localesDir)) {
    console.error(`  No locales/ directory found.`);
    return false;
  }

  const enPath = join(localesDir, "en.json");
  if (!existsSync(enPath)) {
    console.error(`  No en.json found.`);
    return false;
  }

  const uniqueSchemaKeys = [...new Set(schemaKeys)];
  const schemaKeySet = new Set(uniqueSchemaKeys);
  const en = JSON.parse(readFileSync(enPath, "utf-8"));
  const allEnKeys = flattenKeys(en);
  const ownedEnKeys = allEnKeys.filter((k) => !ignoredExtraKeys.has(k));
  const ownedEnKeySet = new Set(ownedEnKeys);

  let hasErrors = false;

  const ignoredKeysPresent = allEnKeys.filter((k) => ignoredExtraKeys.has(k));
  if (ignoredKeysPresent.length > 0) {
    console.warn(
      `  ⚠ Ignoring ${ignoredKeysPresent.length} shared key(s) in ${label} en.json`,
    );
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

  const extraInEn = ownedEnKeys.filter((k) => !schemaKeySet.has(k));
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

  const localeFiles = readdirSync(localesDir).filter(
    (f) => f.endsWith(".json") && f !== "en.json",
  );

  for (const file of localeFiles) {
    const lang = basename(file, ".json");
    const data = JSON.parse(readFileSync(join(localesDir, file), "utf-8"));
    const langKeys = new Set(flattenKeys(data).filter((k) => !ignoredExtraKeys.has(k)));

    const missing = [...ownedEnKeySet].filter((k) => !langKeys.has(k));
    const extra = [...langKeys].filter((k) => !ownedEnKeySet.has(k));

    if (missing.length > 0) {
      console.warn(`  ⚠ [${lang}] Missing ${missing.length} key(s):`);
      for (const k of missing) {
        console.warn(`    - ${k}`);
      }
    }

    if (extra.length > 0) {
      console.warn(`  ⚠ [${lang}] Extra ${extra.length} key(s):`);
      for (const k of extra) {
        console.warn(`    + ${k}`);
      }
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✓ [${lang}] OK — all ${ownedEnKeySet.size} keys present`);
    }
  }

  return !hasErrors;
}

function validateCoreLocales() {
  console.log(`\n━━ core widgets (src/core/widgets) ━━`);
  const schemaKeys = collectSchemaKeysFromDir(coreWidgetsDir);
  return validateLocaleSet("core widgets", coreLocalesDir, schemaKeys);
}

function validateTheme(themeName, coreKeySet) {
  const resolved = resolveThemeDir(themeName);
  if (!resolved) {
    console.error(`Theme "${themeName}" not found.`);
    return false;
  }

  const { dir, source } = resolved;
  console.log(`\n━━ ${themeName} (${source}${themeName}) ━━`);

  const schemaKeys = collectSchemaKeysFromDir(join(dir, "widgets"));
  const themeJsonPath = join(dir, "theme.json");
  if (existsSync(themeJsonPath)) {
    const themeJson = JSON.parse(readFileSync(themeJsonPath, "utf-8"));
    schemaKeys.push(...extractThemeKeys(themeJson));

    if (themeJson.settings?.global) {
      for (const groupKey of Object.keys(themeJson.settings.global)) {
        schemaKeys.push(`global.${groupKey}.name`);
      }
    }
  }

  return validateLocaleSet(
    `${themeName} theme`,
    join(dir, "locales"),
    schemaKeys,
    coreKeySet,
  );
}

// ── Main ──────────────────────────────────────────────────────────────

const requestedTheme = process.argv[2];
const coreSchemaKeys = collectSchemaKeysFromDir(coreWidgetsDir);
const coreKeySet = new Set(coreSchemaKeys);

let allOk = validateCoreLocales();

if (requestedTheme) {
  allOk = validateTheme(requestedTheme, coreKeySet) && allOk;
  process.exit(allOk ? 0 : 1);
} else {
  const themesDir = join(rootDir, "themes");
  const themes = readdirSync(themesDir).filter((d) =>
    existsSync(join(themesDir, d, "theme.json")),
  );

  if (themes.length === 0) {
    console.log("No themes found.");
    process.exit(0);
  }

  for (const theme of themes) {
    if (!validateTheme(theme, coreKeySet)) allOk = false;
  }

  console.log(
    allOk
      ? "\n✓ All theme locales validated."
      : "\n✗ Some theme locales have blocking issues.",
  );
  process.exit(allOk ? 0 : 1);
}
