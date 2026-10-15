import fs from "fs-extra";
import path from "path";
import { pageKey, pagesDir, globalKey, menuKey, menusDir } from "@widgetizer/core/contentAddress";
import { CORE_WIDGETS_DIR } from "../config.js";
import { getCoreWidgets } from "../controllers/coreWidgetsController.js";
import { resolveSiteString } from "@widgetizer/core";
import { loadSiteStrings, readerFor } from "./siteStringsService.js";

// Request-free, scope-first reads of a site's saved content. The editor's
// controllers and the AI assistant's tools both read through these, so the two
// can't drift apart. Nothing here writes.

const CORE_WIDGET_LOCALES_DIR = path.join(CORE_WIDGETS_DIR, "locales");

async function readJson(storage, scope, key) {
  const buf = await storage.read(scope, key);
  return buf == null ? null : JSON.parse(buf.toString("utf8"));
}

export async function listPageSlugs(storage, scope, lang) {
  return (await storage.list(scope, pagesDir(lang)))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));
}

/** A page as saved, without the `id`/`language` the API adds; null when missing. */
export function readPage(storage, scope, slug, lang) {
  return readJson(storage, scope, pageKey(slug, lang));
}

export function readGlobal(storage, scope, type, lang) {
  return readJson(storage, scope, globalKey(type, lang));
}

export async function listMenuIds(storage, scope, lang) {
  return (await storage.list(scope, menusDir(lang)))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""));
}

export function readMenu(storage, scope, id, lang) {
  return readJson(storage, scope, menuKey(id, lang));
}

export function readThemeJson(storage, scope) {
  return readJson(storage, scope, "theme.json");
}

/**
 * Every widget schema the site can use: core widgets (unless the theme opts out),
 * then the theme's own, then its global widgets. Each carries `source` so callers
 * know where its files live.
 */
export async function readWidgetSchemas(storage, scope) {
  let includeCoreWidgets = true;
  try {
    const themeJson = await readThemeJson(storage, scope);
    if (themeJson?.useCoreWidgets === false) includeCoreWidgets = false;
  } catch (error) {
    console.warn(`[siteReader] Failed to read theme.json, defaulting to core widgets=true. Error: ${error.message}`);
  }

  // The storage adapter lists plain names (files, dirs, dotfiles alike) with no
  // type info, so probe each candidate for its schema.json before treating it as
  // a widget folder; a stray .DS_Store would otherwise log a parse warning.
  async function foldersWithSchema(relPaths) {
    const present = await Promise.all(relPaths.map((relPath) => storage.exists(scope, `${relPath}/schema.json`)));
    return relPaths.filter((_, idx) => present[idx]);
  }

  async function readFolder(relPath, source) {
    try {
      const schema = await readJson(storage, scope, `${relPath}/schema.json`);
      if (schema == null) return null;
      if (await storage.exists(scope, `${relPath}/preview.png`)) schema.hasPreview = true;
      Object.defineProperty(schema, "source", { value: { kind: source, path: relPath }, enumerable: false, configurable: true });
      return schema;
    } catch (error) {
      console.warn(`[siteReader] Failed to parse schema for widget at ${relPath}: ${error.message}`);
      return null;
    }
  }

  let schemas = [];
  if (includeCoreWidgets) {
    try {
      const core = await getCoreWidgets();
      for (const schema of core) {
        Object.defineProperty(schema, "source", { value: { kind: "core", path: schema.type }, enumerable: false, configurable: true });
      }
      schemas = schemas.concat(core);
    } catch (error) {
      console.warn(`[siteReader] Failed to load core widgets: ${error.message}`);
    }
  }

  const themeFolders = await foldersWithSchema(
    (await storage.list(scope, "widgets")).filter((name) => name !== "global").map((name) => `widgets/${name}`),
  );
  schemas = schemas.concat(await Promise.all(themeFolders.map((relPath) => readFolder(relPath, "theme"))));

  const globalFolders = await foldersWithSchema(
    (await storage.list(scope, "widgets/global")).map((name) => `widgets/global/${name}`),
  );
  schemas = schemas.concat(await Promise.all(globalFolders.map((relPath) => readFolder(relPath, "global"))));

  return schemas.filter((schema) => schema !== null);
}

/** Whether any schema names a site string as its default (see resolveSchemaDefaults). */
export function schemasNeedResolvedDefaults(schemas) {
  const names = (list) => Array.isArray(list) && list.some((setting) => setting?.defaultKey);
  const startingBlocksName = (list) => Array.isArray(list) && list.some((block) => block?.defaultKeys);
  return schemas.some(
    (s) =>
      names(s?.settings) ||
      (Array.isArray(s?.blocks) && s.blocks.some((b) => names(b?.settings))) ||
      startingBlocksName(s?.defaultBlocks),
  );
}

/**
 * Fill in every `defaultKey` with the theme's word for it in `lang`. Nothing is
 * stored: it is added as `resolvedDefault`, NOT as `default`, because a `default`
 * is copied into a new widget's settings and saved, which would freeze one
 * language's wording into content and follow a page into its translations.
 */
export async function resolveSchemaDefaults(schemas, storage, scope, lang) {
  if (!schemasNeedResolvedDefaults(schemas)) return schemas;
  const { defaultLanguage, languages } = lang;
  const strings = await loadSiteStrings(readerFor(storage, scope), [defaultLanguage, ...languages]);

  const fill = (list) =>
    !Array.isArray(list)
      ? list
      : list.map((setting) => {
          if (!setting?.defaultKey) return setting;
          const found = resolveSiteString(strings, setting.defaultKey, lang.language, defaultLanguage);
          return found === undefined ? setting : { ...setting, resolvedDefault: found };
        });

  // A starting block names its words itself, one key per setting, because the
  // blocks a widget opens with can differ while sharing one block schema.
  const fillStartingBlock = (block) => {
    if (!block?.defaultKeys) return block;
    const resolvedDefaults = {};
    for (const [settingId, key] of Object.entries(block.defaultKeys)) {
      const found = resolveSiteString(strings, key, lang.language, defaultLanguage);
      if (found !== undefined) resolvedDefaults[settingId] = found;
    }
    return Object.keys(resolvedDefaults).length ? { ...block, resolvedDefaults } : block;
  };

  return schemas.map((schema) => {
    const resolved = {
      ...schema,
      settings: fill(schema.settings),
      ...(Array.isArray(schema.blocks)
        ? { blocks: schema.blocks.map((block) => ({ ...block, settings: fill(block?.settings) })) }
        : {}),
      ...(Array.isArray(schema.defaultBlocks) ? { defaultBlocks: schema.defaultBlocks.map(fillStartingBlock) } : {}),
    };
    if (schema.source) Object.defineProperty(resolved, "source", { value: schema.source, enumerable: false, configurable: true });
    return resolved;
  });
}

function mergeLocales(base, extra) {
  const result = { ...base };
  for (const [key, value] of Object.entries(extra ?? {})) {
    result[key] =
      value && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object"
        ? mergeLocales(result[key], value)
        : value;
  }
  return result;
}

/** English labels for settings and widgets: core widget strings, then the theme's own. */
export async function readLabelLocale(storage, scope) {
  let core = {};
  try {
    core = JSON.parse(await fs.readFile(path.join(CORE_WIDGET_LOCALES_DIR, "en.json"), "utf8"));
  } catch {
    core = {};
  }
  let theme = {};
  try {
    theme = (await readJson(storage, scope, "locales/en.json")) ?? {};
  } catch {
    theme = {};
  }
  return mergeLocales(core, theme);
}

const GUIDANCE_FILE = "insights.md";

/** A widget's own guidance notes, from the site's copy of the theme (or the app for core widgets). */
export async function readWidgetGuidance(storage, scope, schema) {
  const source = schema?.source;
  if (!source) return null;
  if (source.kind === "core") {
    const file = path.join(CORE_WIDGETS_DIR, source.path, GUIDANCE_FILE);
    return (await fs.pathExists(file)) ? fs.readFile(file, "utf8") : null;
  }
  const buf = await storage.read(scope, `${source.path}/${GUIDANCE_FILE}`);
  return buf == null ? null : buf.toString("utf8");
}

/**
 * The bytes of an uploaded file, read through the asset adapter and refused past
 * `maxBytes` before anything is buffered. `storedPath` is the path content and the
 * media library record (`/uploads/images/…`).
 * @returns {Promise<{ bytes: Buffer } | { unavailable: "missing" | "too-large" }>}
 */
export async function readUploadBytes(assetStorage, scope, storedPath, maxBytes) {
  const key = String(storedPath || "").replace(/^\/uploads\//, "");
  if (!key || key === storedPath) return { unavailable: "missing" };
  const stat = await assetStorage.stat(scope, key);
  if (!stat) return { unavailable: "missing" };
  if (stat.size > maxBytes) return { unavailable: "too-large" };
  const stream = await assetStorage.download(scope, key);
  if (!stream) return { unavailable: "missing" };
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > maxBytes) {
      stream.destroy?.();
      return { unavailable: "too-large" };
    }
    chunks.push(chunk);
  }
  return { bytes: Buffer.concat(chunks) };
}
