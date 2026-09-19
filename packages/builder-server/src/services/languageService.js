import { randomUUID } from "crypto";
import { isValidLanguageCode, normalizeLanguageCode } from "@widgetizer/core/languages";
import {
  globalKey,
  globalsDir,
  itemKey,
  itemsDir,
  menuKey,
  menusDir,
  pageKey,
  pagesDir,
  isReservedSlugPrefix,
} from "@widgetizer/core/contentAddress";
import { projectLanguages } from "../utils/contentLanguage.js";
import { listCollectionSchemas } from "./collectionService.js";
import {
  updateGlobalWidgetMediaUsage,
  removeGlobalWidgetFromMediaUsage,
  removePageFromMediaUsage,
  removeCollectionItemFromMediaUsage,
  syncPageMediaUsageOnWrite,
  updateCollectionItemMediaUsage,
} from "./mediaUsageService.js";
import { deleteMediaTranslationsForLanguage } from "../db/repositories/mediaRepository.js";
import { clearDeletedReferencesInSection } from "../utils/linkEnrichment.js";

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
 * The identity a content file's media-usage row is keyed by. A file that cannot
 * be read is refused rather than assumed to have no uuid: that assumption would
 * clear the wrong row and strand the real one.
 */
async function readIdentity(storage, scope, key) {
  let content;
  try {
    content = await readJson(storage, scope, key);
  } catch (error) {
    throw new LanguageError(`"${key}" could not be read, so its media usage cannot be cleared: ${error.message}`, 500);
  }
  return { uuid: content?.uuid };
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

/** The `.json` entries directly inside a directory, `[]` when it does not exist. */
async function jsonNames(storage, scope, dir) {
  return (await storage.list(scope, dir)).filter((name) => name.endsWith(".json"));
}

const slugsIn = (names) => names.filter((name) => name !== "_order.json").map((name) => name.replace(/\.json$/, ""));

/**
 * Every collection type, with the item slugs it holds in this language. A type
 * whose folder holds only `_order.json` is still listed, with no slugs, so that
 * leftover is deleted too.
 */
async function itemSlugsByType(storage, scope, lang) {
  const byType = new Map();
  const types = (await storage.list(scope, "collections")).filter((name) => !name.includes("."));
  for (const type of types) {
    const names = await jsonNames(storage, scope, itemsDir(type, lang));
    if (names.length) byType.set(type, slugsIn(names));
  }
  return byType;
}

function assertRemovable(project, code) {
  const { defaultLanguage, languages } = projectLanguages(project);
  const language = normalizeLanguageCode(code);
  if (!language) throw new LanguageError("A language code is required.");
  if (language === defaultLanguage) {
    throw new LanguageError(
      "The site's default language cannot be removed. Remove the other languages first, then change it.",
    );
  }
  if (!languages.includes(language)) {
    throw new LanguageError(`"${language}" is not one of the site's languages.`, 404);
  }
  return { language, defaultLanguage, languages };
}

/**
 * What removing this language would delete, for the confirmation modal to state
 * before anything is touched.
 * @returns {Promise<{ pages: number, items: number, menus: number }>}
 */
export async function countLanguageContent({ storage, scope, project, code }) {
  const { language, defaultLanguage } = assertRemovable(project, code);
  const lang = { language, defaultLanguage };

  const pages = (await jsonNames(storage, scope, pagesDir(lang))).length;
  const menus = (await jsonNames(storage, scope, menusDir(lang))).length;
  let items = 0;
  for (const slugs of (await itemSlugsByType(storage, scope, lang)).values()) items += slugs.length;

  return { pages, items, menus };
}

/**
 * Rebuild the media-usage rows of every file the removal did not manage to
 * delete. Only the failure path calls this: a successful removal has nothing
 * left to account for. A file that is gone is skipped, and a failure to rebuild
 * one row is logged rather than replacing the error that brought us here.
 */
async function restoreUsageOfSurvivors(storage, scope, lang, { items, pages, globalTypes }) {
  const restore = async (key, sync) => {
    try {
      const content = await readJson(storage, scope, key);
      if (content) await sync(content);
    } catch (error) {
      console.warn(`[languages] Could not restore media usage for ${key}: ${error.message}`);
    }
  };

  for (const { type, key } of items) {
    await restore(key, (item) => updateCollectionItemMediaUsage(scope.projectId, item, type, lang));
  }
  for (const { key } of pages) {
    await restore(key, (page) => syncPageMediaUsageOnWrite(scope.projectId, page, lang));
  }
  for (const type of globalTypes) {
    await restore(globalKey(type, lang), (widget) =>
      updateGlobalWidgetMediaUsage(scope.projectId, type, widget, lang),
    );
  }
}

/**
 * Delete a language and everything written in it: its pages and globals, its
 * menus, its collection items, and the media-usage rows of all of them. Uploaded
 * binaries are shared across languages and are never touched.
 *
 * Returns the project's remaining additional codes; the caller persists them, so
 * a failed delete never leaves a language unlisted with content still on disk.
 *
 * @param {{ storage: object, scope: object, project: object, code: string }} args
 * @returns {Promise<{ languages: string[], deleted: { pages: number, items: number, menus: number } }>}
 */
export async function removeLanguage({ storage, scope, project, code }) {
  const { language, defaultLanguage, languages } = assertRemovable(project, code);
  const lang = { language, defaultLanguage };

  // Read every identity BEFORE deleting anything: a usage row is keyed by the
  // uuid inside its file, so a file deleted before its row is cleared can never
  // be matched again. An unreadable file aborts here, with nothing touched,
  // rather than being treated as one that simply has no uuid.
  const items = [];
  const itemFolders = await itemSlugsByType(storage, scope, lang);
  for (const [type, slugs] of itemFolders) {
    for (const slug of slugs) {
      const key = itemKey(type, slug, lang);
      items.push({ type, slug, key, uuid: (await readIdentity(storage, scope, key)).uuid });
    }
  }

  const pages = [];
  for (const slug of slugsIn(await jsonNames(storage, scope, pagesDir(lang)))) {
    const key = pageKey(slug, lang);
    pages.push({ slug, key, uuid: (await readIdentity(storage, scope, key)).uuid });
  }

  const globalTypes = (await jsonNames(storage, scope, globalsDir(lang))).map((name) =>
    name.replace(/\.json$/, ""),
  );
  // Menus need their uuids read up front too: a widget selects a menu BY uuid, so
  // clearing those selections afterwards needs an identity the deleted file no
  // longer has.
  const menus = [];
  for (const id of slugsIn(await jsonNames(storage, scope, menusDir(lang)))) {
    const key = menuKey(id, lang);
    menus.push({ id, key, uuid: (await readIdentity(storage, scope, key)).uuid });
  }

  // Clear the row, then delete the file. The other order cannot be retried: a
  // failure between the two would leave a row no later pass can find its way
  // back to. If a delete does fail, the rows of whatever survived are rebuilt
  // before the error leaves here, so nothing is ever reported unused while it
  // is still on disk and still showing its images.
  // What is CONFIRMED gone, accumulated as each delete returns. References are
  // cleared against this and nothing else: a target that survived is still there,
  // and one whose delete threw may be — and removal is retryable, so clearing
  // references to it would destroy links to content that is coming back.
  const deletedPageUuids = [];
  const deletedItemUuids = [];
  const deletedMenuUuids = [];

  /**
   * Surviving content must not keep pointing at what this removal deleted. The
   * caller already holds the content-write section, so the batch walk does not
   * take it.
   *
   * Never throws: the content IS deleted, and reporting the removal as failed
   * because a sweep could not finish would be a worse lie than the one this
   * replaces. What it could not clean is returned instead, so the caller can say
   * so rather than claim complete success.
   */
  const clearReferences = async () => {
    try {
      const { incomplete } = await clearDeletedReferencesInSection(storage, scope, {
        pageUuids: deletedPageUuids,
        itemUuids: deletedItemUuids,
        menuUuids: deletedMenuUuids,
        defaultLanguage,
      });
      return incomplete;
    } catch (cleanupError) {
      console.warn(`[languages] Could not clear references to removed ${language} content: ${cleanupError.message}`);
      return [{ key: "*", reason: cleanupError.message }];
    }
  };

  try {
    for (const { type, slug, key, uuid } of items) {
      await removeCollectionItemFromMediaUsage(scope.projectId, { uuid, slug }, type, lang);
      await storage.delete(scope, key);
      if (uuid) deletedItemUuids.push(uuid);
    }
    for (const type of itemFolders.keys()) {
      await storage.delete(scope, `${itemsDir(type, lang)}/_order.json`);
    }

    for (const { slug, key, uuid } of pages) {
      await removePageFromMediaUsage(scope.projectId, { uuid, slug }, lang);
      await storage.delete(scope, key);
      if (uuid) deletedPageUuids.push(uuid);
    }

    for (const type of globalTypes) {
      await removeGlobalWidgetFromMediaUsage(scope.projectId, type, lang);
      await storage.delete(scope, globalKey(type, lang));
    }

    for (const { key, uuid } of menus) {
      await storage.delete(scope, key);
      if (uuid) deletedMenuUuids.push(uuid);
    }

    // The shared library keeps its binaries and its default-language metadata;
    // only this language's alt/title/caption go. Last, so a failure above
    // leaves them for the retry to find.
    deleteMediaTranslationsForLanguage(scope.projectId, language);
  } catch (error) {
    // Partial removal. Clear references to what did go — those targets are gone
    // for good either way — and leave every other reference alone for the retry.
    // Before the usage rebuild, so it reads the content as it will finally be.
    await clearReferences();
    await restoreUsageOfSurvivors(storage, scope, lang, { items, pages, globalTypes });
    throw error;
  }

  const incompleteCleanup = await clearReferences();

  return {
    languages: languages.filter((other) => other !== language),
    deleted: { pages: pages.length, items: items.length, menus: menus.length },
    // Content that still points at what was just removed, because it could not be
    // written. The removal itself succeeded; this is the part that did not.
    incompleteCleanup,
  };
}
