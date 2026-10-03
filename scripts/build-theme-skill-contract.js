/**
 * Builds skills/widgetizer-theme/references/contract.json: the machine-readable
 * list of what a theme may use (setting types, Liquid tags and their arguments,
 * filters, core widgets/snippets/visitor strings, fonts, collection rules).
 *
 * The skill carries this authoring reference outside the repository. The app
 * validator reads the current source instead of relying on the saved snapshot.
 * themeSkill.test.js detects changes to the generated catalog; behavioral
 * validation and the prose references need their own checks.
 *
 *   node scripts/build-theme-skill-contract.js           write the file
 *   node scripts/build-theme-skill-contract.js --check   exit 1 if it is stale
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { Liquid } from "liquidjs";
import { createLiquidEngine, widgetizerLiquidTags } from "@widgetizer/render-engine";
import { SUPPORTED_SETTING_TYPES } from "../packages/core/src/config/settingTypes.js";
import { COLLECTION_STRUCTURED_DATA_RULES } from "../packages/core/src/structuredData/collectionTypes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTRACT_PATH = path.join(ROOT, "skills", "widgetizer-theme", "references", "contract.json");

const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
const readJson = (...parts) => JSON.parse(read(...parts));
const sorted = (values) => [...new Set(values)].sort();

function flattenKeys(value, prefix) {
  return Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === "object" ? flattenKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

/** Tag name → the arguments its implementation reads from `options`. */
function readCustomTags() {
  const tags = {};
  for (const [name, implementation] of Object.entries(widgetizerLiquidTags)) {
    const source = implementation.render.toString();

    // Only a tag that renders its argument hash takes arguments; in the others
    // `options` is an unrelated local.
    const args = [];
    if (source.includes("this.hash.render(")) {
      const destructure = source.match(/const\s*\{([\s\S]*?)\}\s*=\s*options;/);
      if (destructure) {
        for (const part of destructure[1].split(",")) {
          const key = part.trim().split(/[:=]/)[0].trim();
          if (key) args.push(key);
        }
      }
      for (const match of source.matchAll(/\boptions\.(\w+)/g)) args.push(match[1]);
    }
    tags[name] = sorted(args);
  }
  return tags;
}

function readCollectionSorts() {
  const source = read("packages", "builder-server", "src", "services", "collectionService.js");
  const match = source.match(/const ALLOWED_SORTS = (\[[^\]]+\]);/);
  if (!match) throw new Error("ALLOWED_SORTS not found in collectionService.js");
  return JSON.parse(match[1]);
}

function readDefaultImageSizes() {
  const source = read("packages", "builder-server", "src", "db", "repositories", "settingsRepository.js");
  const block = source.match(/sizes:\s*\{([\s\S]*?)\n\s*\},?\n/);
  const names = block ? [...block[1].matchAll(/(\w+):\s*\{\s*width/g)].map((m) => m[1]) : [];
  if (names.length === 0) throw new Error("Default image sizes not found in settingsRepository.js");
  return names;
}

/** Core widget type → its setting ids and block types, so starter pages that use one can be checked. */
function readCoreWidgets(coreWidgetsDir) {
  const settingTypesById = (settings) =>
    Object.fromEntries((settings || []).filter((s) => s.type !== "header").map((s) => [s.id, s.type]));

  const widgets = {};
  const names = fs.readdirSync(coreWidgetsDir).filter((entry) => entry.startsWith("core-"));
  for (const name of sorted(names)) {
    const schema = JSON.parse(fs.readFileSync(path.join(coreWidgetsDir, name, "schema.json"), "utf8"));
    widgets[name] = {
      settings: settingTypesById(schema.settings),
      blocks: Object.fromEntries((schema.blocks || []).map((block) => [block.type, settingTypesById(block.settings)])),
    };
  }
  return widgets;
}

export function buildContract() {
  const builtIn = new Liquid();
  const configured = createLiquidEngine();
  const fonts = readJson("packages", "core", "src", "config", "fonts.json");
  const coreWidgetsDir = path.join(ROOT, "packages", "core", "src", "widgets");
  const coreSnippetsDir = path.join(ROOT, "packages", "core", "src", "snippets");
  const coreLocale = readJson("packages", "core", "src", "widgets", "locales", "en.json");

  return {
    appVersion: readJson("package.json").version,
    liquidVersion: createRequire(import.meta.url)("liquidjs/package.json").version,
    settingTypes: [...SUPPORTED_SETTING_TYPES],
    liquid: {
      builtInTags: sorted(Object.keys(builtIn.tags)),
      builtInFilters: sorted(Object.keys(builtIn.filters)),
      customTags: readCustomTags(),
      customFilters: sorted(
        Object.keys(configured.filters).filter((name) => configured.filters[name] !== builtIn.filters[name]),
      ),
    },
    coreWidgets: readCoreWidgets(coreWidgetsDir),
    coreSnippets: sorted(
      fs
        .readdirSync(coreSnippetsDir)
        .filter((name) => name.endsWith(".liquid"))
        .map((name) => name.replace(/\.liquid$/, "")),
    ),
    coreSiteKeys: sorted(flattenKeys(coreLocale.site || {}, "site.")),
    imageSizes: readDefaultImageSizes(),
    collections: {
      sorts: readCollectionSorts(),
      structuredData: JSON.parse(JSON.stringify(COLLECTION_STRUCTURED_DATA_RULES)),
    },
    // Font stack → the weights the font picker offers for it.
    fonts: Object.fromEntries([...fonts.system, ...fonts.google].map((font) => [font.stack, font.availableWeights])),
  };
}

export function serializeContract(contract) {
  return `${JSON.stringify(contract, null, 2)}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const next = serializeContract(buildContract());
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(CONTRACT_PATH) ? fs.readFileSync(CONTRACT_PATH, "utf8") : "";
    if (current.replace(/\r\n/g, "\n") !== next) {
      console.error("contract.json is stale. Run: node scripts/build-theme-skill-contract.js");
      process.exit(1);
    }
    console.log("contract.json is up to date.");
  } else {
    fs.mkdirSync(path.dirname(CONTRACT_PATH), { recursive: true });
    fs.writeFileSync(CONTRACT_PATH, next);
    console.log(`Wrote ${path.relative(ROOT, CONTRACT_PATH)}`);
  }
}
