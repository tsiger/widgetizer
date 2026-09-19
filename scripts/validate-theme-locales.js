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
import { join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  flattenKeys,
  extractThemeKeys,
  findSchemaFiles,
} from "./validate-theme-locales-helpers.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");
// Core widget locale definitions are read from the shared core package.
const coreWidgetsDir = join(rootDir, "packages", "core", "src", "widgets");
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

/**
 * Every `site.*` key a theme actually asks for: `| t` in its templates, and
 * `defaultKey` in its schemas. A key nobody wrote renders its own last segment
 * — `site.nope.not.here` reads as "here" — which looks like copy rather than
 * like a mistake, so it has to be caught before it ships rather than spotted
 * on a page.
 */
function collectSiteKeyUses(dir) {
  const uses = new Map(); // key -> where it was seen
  if (!existsSync(dir)) return uses;

  const note = (key, where) => {
    // `site.` is how a template reads, and what is stored IS the site block, so
    // the filter accepts either; normalize the same way it does.
    const normalized = key.startsWith("site.") ? key : `site.${key}`;
    if (!uses.has(normalized)) uses.set(normalized, where);
  };

  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "updates" || entry.name === "node_modules") continue;
        walk(full);
        continue;
      }
      if (entry.name.endsWith(".liquid")) {
        const source = readFileSync(full, "utf-8");
        for (const [, key] of source.matchAll(/['"]([a-zA-Z0-9_.]+)['"]\s*\|\s*t\b/g)) {
          note(key, relative(dir, full));
        }
      } else if (entry.name === "schema.json") {
        try {
          const schema = JSON.parse(readFileSync(full, "utf-8"));
          const fromList = (list) => {
            if (!Array.isArray(list)) return;
            for (const setting of list) if (setting?.defaultKey) note(setting.defaultKey, relative(dir, full));
          };
          fromList(schema.settings);
          if (Array.isArray(schema.blocks)) for (const block of schema.blocks) fromList(block?.settings);
        } catch {
          // A malformed schema is already reported by the key collection above.
        }
      }
    }
  };

  walk(dir);
  return uses;
}

function validateLocaleSet(label, localesDir, schemaKeys, ignoredExtraKeys = new Set(), siteKeyUses = new Map()) {
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
  // `site.*` is what a VISITOR reads on the published page. No schema points at
  // it — a template asks for it by key — so it is counted on its own rather
  // than reported as orphaned editor labels.
  const isSiteKey = (k) => k === "site" || k.startsWith("site.");
  const ownedEnKeys = allEnKeys.filter((k) => !ignoredExtraKeys.has(k) && !isSiteKey(k));
  const ownedEnKeySet = new Set(ownedEnKeys);
  const siteEnKeys = allEnKeys.filter(isSiteKey);
  const siteEnKeySet = new Set(siteEnKeys);

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

  if (siteEnKeys.length > 0) {
    console.log(`  ✓ ${siteEnKeys.length} site string(s) for visitors`);
  }

  const askedForNothing = [...siteKeyUses].filter(([key]) => getNested(en, key) === undefined);
  if (askedForNothing.length > 0) {
    hasErrors = true;
    console.error(`  ✗ ${askedForNothing.length} site string(s) asked for but never written:`);
    for (const [key, where] of askedForNothing) {
      console.error(`    - ${key}  (${where})`);
    }
  }

  const neverAsked = siteEnKeys.filter((key) => !siteKeyUses.has(key));
  if (neverAsked.length > 0) {
    console.warn(`  ⚠ ${neverAsked.length} site string(s) nothing asks for:`);
    for (const key of neverAsked) {
      console.warn(`    + ${key}`);
    }
  }

  const extraInEn = ownedEnKeys.filter((k) => !schemaKeySet.has(k));
  if (extraInEn.length > 0) {
    console.warn(
      `  ⚠ ${extraInEn.length} extra key(s) in en.json not referenced by any schema:`,
    );
    for (const k of extraInEn) {
      console.warn(`    + ${k}`);
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
    const allLangKeys = flattenKeys(data).filter((k) => !ignoredExtraKeys.has(k));
    const langKeys = new Set(allLangKeys.filter((k) => !isSiteKey(k)));
    const langSiteKeys = new Set(allLangKeys.filter(isSiteKey));

    // Editor labels are only expected in another language when that file
    // carries any; a translation of the visitor strings alone is the normal
    // shape, because the editor stays English.
    const missing = langKeys.size > 0 ? [...ownedEnKeySet].filter((k) => !langKeys.has(k)) : [];
    const extra = [...langKeys].filter((k) => !ownedEnKeySet.has(k));
    const missingSite = [...siteEnKeySet].filter((k) => !langSiteKeys.has(k));
    const extraSite = [...langSiteKeys].filter((k) => !siteEnKeySet.has(k));

    for (const [what, keys, sign] of [
      ["Missing", missing, "-"],
      ["Extra", extra, "+"],
      ["Missing site string", missingSite, "-"],
      ["Extra site string", extraSite, "+"],
    ]) {
      if (keys.length === 0) continue;
      console.warn(`  ⚠ [${lang}] ${what} ${keys.length} key(s):`);
      for (const k of keys) {
        console.warn(`    ${sign} ${k}`);
      }
    }

    if (missing.length === 0 && extra.length === 0 && missingSite.length === 0 && extraSite.length === 0) {
      console.log(`  ✓ [${lang}] OK — ${langSiteKeys.size} site string(s), ${langKeys.size} editor key(s)`);
    }
  }

  return !hasErrors;
}

function validateCoreLocales() {
  console.log(`\n━━ core widgets (packages/core/src/widgets) ━━`);
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
    collectSiteKeyUses(dir),
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
  // A `__`-prefixed theme is a local scratch one — gitignored, often broken on
  // purpose. Validate it by name when you want to; never as part of the sweep
  // that runs before the dev server starts.
  const themes = readdirSync(themesDir).filter(
    (d) => !d.startsWith("__") && existsSync(join(themesDir, d, "theme.json")),
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
