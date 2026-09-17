import { randomUUID } from "crypto";
import { isValidLanguageCode, normalizeLanguageCode } from "@widgetizer/core/languages";
import { globalKey, menuKey, menusDir, pageKey, isReservedSlugPrefix } from "@widgetizer/core/contentAddress";
import { projectLanguages } from "../utils/contentLanguage.js";
import { listCollectionSchemas } from "./collectionService.js";
import { updateGlobalWidgetMediaUsage } from "./mediaUsageService.js";

const GLOBAL_TYPES = ["header", "footer"];

export class LanguageError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "LanguageError";
    this.status = status;
  }
}

async function readJson(storage, scope, key) {
  const buf = await storage.read(scope, key);
  return buf == null ? null : JSON.parse(buf.toString("utf8"));
}

/**
 * A language folder and a same-named root page or collection prefix are one
 * public address, so the code cannot be a name the site already publishes.
 */
async function assertCodeIsFree(storage, scope, code) {
  if (await storage.exists(scope, pageKey(code))) {
    throw new LanguageError(
      `"${code}" is already the slug of a page. Rename that page before adding the language.`,
    );
  }
  if (isReservedSlugPrefix(code)) {
    throw new LanguageError(`"${code}" is a reserved name and cannot be used as a language.`);
  }
  const schemas = await listCollectionSchemas(storage, scope);
  const clash = schemas.find((schema) => schema.hasItemPages && schema.slugPrefix === code);
  if (clash) {
    throw new LanguageError(
      `"${code}" is already the URL prefix of the "${clash.displayName || clash.type}" collection. Change that prefix before adding the language.`,
    );
  }
}

/**
 * Copy the default language's menus into the new language, each with a fresh
 * uuid. Returns the reference map the globals are rewritten through, keyed by
 * every form a stored menu setting can take. Menu items keep the page
 * references they inherited: at this moment no page exists in the new language,
 * so there is nothing to re-point them at.
 */
async function seedMenus(storage, scope, lang) {
  const files = (await storage.list(scope, menusDir())).filter((name) => name.endsWith(".json"));
  // Keyed by both forms a stored menu setting can take, since the renderer
  // accepts a uuid or the menu's slug and only the uuid identifies the copy.
  const menuRefs = new Map();

  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    const menu = await readJson(storage, scope, menuKey(id));
    if (!menu) continue;
    const uuid = randomUUID();
    if (menu.uuid) menuRefs.set(menu.uuid, uuid);
    menuRefs.set(id, uuid);
    const now = new Date().toISOString();
    await storage.write(
      scope,
      menuKey(id, lang),
      JSON.stringify({ ...menu, id, uuid, created: now, updated: now }, null, 2),
    );
  }

  return menuRefs;
}

/** The ids of every `menu`-type setting a widget schema declares, per block type and top level. */
function menuSettingIds(schema) {
  const ids = (settings) => (Array.isArray(settings) ? settings.filter((s) => s?.type === "menu").map((s) => s.id) : []);
  return {
    settings: ids(schema?.settings),
    blocks: new Map((schema?.blocks || []).filter((b) => b?.type).map((b) => [b.type, ids(b.settings)])),
  };
}

const remapped = (value, menuRefs) => (typeof value === "string" && menuRefs.has(value) ? menuRefs.get(value) : value);

/**
 * Copy header and footer into the new language, repointing their menu settings
 * at the copies made above. This rewrites scaffolding we generated, not the
 * author's links: the page references inside the menu items are left alone.
 */
async function seedGlobals(storage, scope, lang, menuRefs) {
  for (const type of GLOBAL_TYPES) {
    const widget = await readJson(storage, scope, globalKey(type));
    if (!widget) continue;

    const schema = await readJson(storage, scope, `widgets/global/${widget.type || type}/schema.json`).catch(() => null);
    const menuIds = menuSettingIds(schema);

    const settings = { ...(widget.settings || {}) };
    for (const id of menuIds.settings) {
      if (id in settings) settings[id] = remapped(settings[id], menuRefs);
    }

    const blocks = {};
    for (const [blockId, block] of Object.entries(widget.blocks || {})) {
      const blockSettings = { ...(block?.settings || {}) };
      for (const id of menuIds.blocks.get(block?.type) || []) {
        if (id in blockSettings) blockSettings[id] = remapped(blockSettings[id], menuRefs);
      }
      blocks[blockId] = { ...block, settings: blockSettings };
    }

    const copy = { ...widget, settings, blocks };
    await storage.write(scope, globalKey(type, lang), JSON.stringify(copy, null, 2));
    // The copy holds the same images as its source; without its own usage rows
    // clearing the source's would mark them unused while this one still shows them.
    await updateGlobalWidgetMediaUsage(scope.projectId, type, copy, lang);
  }
}

/**
 * Add a site language and seed the singletons it needs to render at all:
 * menus first, then the header and footer repointed at those copies. No pages
 * are copied — a translated page is written deliberately, one at a time.
 *
 * Returns the project's new list of additional codes; the caller persists it,
 * so a failed seed never leaves a language recorded with nothing behind it.
 *
 * @param {{ storage: object, scope: object, project: object, code: string }} args
 * @returns {Promise<{ languages: string[] }>}
 */
export async function addLanguage({ storage, scope, project, code }) {
  const { defaultLanguage, languages } = projectLanguages(project);
  const language = normalizeLanguageCode(code);

  if (!language) throw new LanguageError("A language code is required.");
  if (!isValidLanguageCode(language)) {
    throw new LanguageError(`"${code}" is not a language this version can publish.`);
  }
  if (language === defaultLanguage) {
    throw new LanguageError(`"${language}" is already the site's default language.`);
  }
  if (languages.includes(language)) {
    throw new LanguageError(`"${language}" is already one of the site's languages.`, 409);
  }
  await assertCodeIsFree(storage, scope, language);

  const lang = { language, defaultLanguage };
  const menuRefs = await seedMenus(storage, scope, lang);
  await seedGlobals(storage, scope, lang, menuRefs);

  return { languages: [...languages, language] };
}
