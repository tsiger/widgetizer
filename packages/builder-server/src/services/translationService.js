/**
 * Translation groups.
 *
 * A page or collection item carries a `translationGroupId`: its own uuid when it
 * stands alone, or the id it joined when it was created as another language's
 * version of something. A group has no root and no owner — deleting any member
 * leaves the rest joined — so membership is only ever discovered by reading the
 * content of each language.
 *
 * A source is never rewritten to record the group it now heads: `groupIdOf`
 * falls back to the content's own uuid, so it already answers to that id. That
 * is deliberate — writing it back would mean saving a snapshot read before the
 * new version was written, which would undo an edit made in between.
 */
import { normalizeLanguageCode } from "@widgetizer/core/languages";
import { itemsDir, itemKey, pageKey, pagesDir, translationGroupIdOf } from "@widgetizer/core/contentAddress";
import { projectLanguages, projectLanguageContexts } from "../utils/contentLanguage.js";
import { createKeyedSerializer } from "../utils/serializeByKey.js";

// Checking whether a language already holds a member, allocating the slug and
// writing are one operation per project: run concurrently they would both find
// the language free and create a second member of the same group.
export const serializeTranslationOps = createKeyedSerializer();

export class TranslationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "TranslationError";
    this.status = status;
  }
}

/** The group a piece of content belongs to: the one it joined, else itself. */
export const groupIdOf = translationGroupIdOf;

/**
 * Content written before uuids existed has no stable identity, so a group named
 * after it would change on every request and the one-per-language rule could
 * never hold. Saving it once stamps a uuid; until then, translating is refused
 * rather than silently producing versions that cannot find each other.
 */
export function assertHasIdentity(content, what) {
  if (groupIdOf(content)) return;
  throw new TranslationError(
    `This ${what} has no stable id yet. Open and save it once, then create its version.`,
    409,
  );
}

async function readJson(storage, scope, key) {
  const buf = await storage.read(scope, key);
  return buf == null ? null : JSON.parse(buf.toString("utf8"));
}

const jsonNames = async (storage, scope, dir) =>
  (await storage.list(scope, dir)).filter((name) => name.endsWith(".json") && name !== "_order.json");

/**
 * The language a version is being created in, checked against the site's own.
 * @returns {{ language: string, defaultLanguage: string, languages: string[] }}
 */
export function resolveTargetLanguage(project, code) {
  const { defaultLanguage, languages } = projectLanguages(project);
  const language = normalizeLanguageCode(code);
  if (!language) throw new TranslationError("A target language is required.");
  if (language !== defaultLanguage && !languages.includes(language)) {
    throw new TranslationError(`"${language}" is not one of the site's languages.`);
  }
  return { language, defaultLanguage, languages };
}

/**
 * Read a member candidate. A file that cannot be read is refused rather than
 * skipped: it might be the very member that decides whether this language is
 * already taken, and guessing "absent" would let a second one in.
 */
async function readMember(storage, scope, key) {
  try {
    return await readJson(storage, scope, key);
  } catch (error) {
    throw new TranslationError(
      `"${key}" could not be read, so its translation group is unknown: ${error.message}`,
      500,
    );
  }
}

/** The group's page in one language, or null. One member per language is the invariant. */
export async function findPageInGroup({ storage, scope, lang, groupId }) {
  for (const name of await jsonNames(storage, scope, pagesDir(lang))) {
    const slug = name.replace(/\.json$/, "");
    const page = await readMember(storage, scope, pageKey(slug, lang));
    if (page && groupIdOf(page) === groupId) return { ...page, slug: page.slug || slug };
  }
  return null;
}

/** The group's item of one collection type in one language, or null. */
export async function findItemInGroup({ storage, scope, collectionType, lang, groupId }) {
  for (const name of await jsonNames(storage, scope, itemsDir(collectionType, lang))) {
    const slug = name.replace(/\.json$/, "");
    const item = await readMember(storage, scope, itemKey(collectionType, slug, lang));
    if (item && groupIdOf(item) === groupId) return { ...item, slug: item.slug || slug };
  }
  return null;
}

/**
 * Every member of a group, across languages and across pages and items — what the
 * language chips and the editor's language menu read.
 * @returns {Promise<Array<{ kind: "page"|"item", collectionType?: string, language: string, uuid: string, slug: string, name?: string }>>}
 */
export async function findGroupMembers({ storage, scope, project, groupId }) {
  if (!groupId) return [];
  const members = [];
  const types = (await storage.list(scope, "collections")).filter((name) => !name.includes("."));

  for (const lang of projectLanguageContexts(project)) {
    const page = await findPageInGroup({ storage, scope, lang, groupId });
    if (page) {
      members.push({ kind: "page", language: lang.language, uuid: page.uuid, slug: page.slug, name: page.name });
    }
    for (const collectionType of types) {
      const item = await findItemInGroup({ storage, scope, collectionType, lang, groupId });
      if (item) {
        members.push({
          kind: "item",
          collectionType,
          language: lang.language,
          uuid: item.uuid,
          slug: item.slug,
          name: item.title,
        });
      }
    }
  }

  return members;
}

/**
 * Refuse a second member of the same group in one language — a group holds at
 * most one version per language, which is what makes "the Greek one" mean
 * something.
 */
export function assertLanguageFree(existing, language, what) {
  if (!existing) return;
  throw new TranslationError(`A ${what} in "${language}" already exists for this translation group.`, 409);
}
