import fs from "node:fs/promises";
import path from "node:path";
import { CORE_WIDGETS_DIR } from "../config.js";

/**
 * The words put on the published page, per language.
 *
 * Two owners, and the order between them matters. The built-in widgets ship
 * their own words with the app; a theme keeps its own under the `site` root of
 * `locales/<lang>.json`, alongside the `tTheme:` keys that name settings in the
 * editor. Only the `site` half is read here: the editor stays English and reads
 * its own half through the theme controller, which merges the same two owners
 * the same way round.
 *
 * A theme's word wins over core's, key by key, so an author can reword or
 * translate anything the built-in widgets say without core having to know. What
 * a theme leaves alone falls back to core, which is what lets `core-form` read
 * correctly in a theme that ships no locales at all.
 *
 * Each language is then merged over English so a half-finished translation
 * falls back word by word, which is what makes shipping a partial one worth
 * doing. The theme half comes from the project's OWN copy of the theme
 * (`data/projects/<folder>/locales/`), the same copy every other theme file
 * comes from, so applying a theme update is what brings new strings in.
 */

const CORE_LOCALES_DIR = path.join(CORE_WIDGETS_DIR, "locales");
/** Deep-merge `overlay` onto `base`, objects only. */
function merge(base, overlay) {
  const out = { ...base };
  for (const [key, value] of Object.entries(overlay || {})) {
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && out[key] && typeof out[key] === "object"
        ? merge(out[key], value)
        : value;
  }
  return out;
}

function siteBlockOf(raw) {
  if (raw == null) return null;
  const parsed = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf8"));
  return parsed && typeof parsed.site === "object" ? parsed.site : null;
}

async function readSiteBlock(read, language) {
  try {
    return siteBlockOf(await read(`locales/${language}.json`));
  } catch {
    // No file for this language, or an unreadable one: the theme simply does
    // not translate it, and English stands in.
    return null;
  }
}

/**
 * The built-in widgets' own words. Read from where the app keeps them rather
 * than through the caller's adapter: they ship with the code, like the core
 * widget templates beside them, and belong to no project.
 */
async function readCoreSiteBlock(language) {
  try {
    return siteBlockOf(await fs.readFile(path.join(CORE_LOCALES_DIR, `${language}.json`), "utf-8"));
  } catch {
    return null;
  }
}

/**
 * @param {(relPath: string) => Promise<Buffer|string|null>} read - reads one file
 *   of the project's theme copy. Passed in rather than assumed so the caller's
 *   own storage root is the one used: the backend is adapter-agnostic, and a
 *   host with its project files somewhere else must not have them read from a
 *   path this module guessed.
 * @param {string[]} languages - every language the project publishes
 * @returns {Promise<Record<string, object>>} language -> strings, English merged under each
 */
export async function loadSiteStrings(read, languages = []) {
  const english = merge((await readCoreSiteBlock("en")) || {}, (await readSiteBlock(read, "en")) || {});
  const out = { en: english };

  for (const language of languages) {
    if (!language || language === "en") continue;
    const core = await readCoreSiteBlock(language);
    const own = await readSiteBlock(read, language);
    out[language] = core || own ? merge(english, merge(core || {}, own || {})) : english;
  }
  return out;
}

/** A reader over a storage adapter, which is what every scoped caller has. */
export const readerFor = (storage, scope) => (relPath) => storage.read(scope, relPath);
