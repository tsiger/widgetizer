/**
 * The words a theme puts on the published page, per language.
 *
 * A theme keeps them under the `site` root of `locales/<lang>.json`, alongside
 * the `tTheme:` keys that name settings in the editor. Only the `site` half is
 * read here: the editor stays English and reads its own half through the theme
 * controller.
 *
 * Each language is merged over English so a half-finished translation falls
 * back word by word, which is what makes shipping a partial one worth doing.
 * A project reads its OWN copy of the theme (`data/projects/<folder>/locales/`),
 * the same copy every other theme file comes from, so applying a theme update
 * is what brings new strings in.
 */
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

async function readSiteBlock(read, language) {
  try {
    const raw = await read(`locales/${language}.json`);
    if (raw == null) return null;
    const parsed = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf8"));
    return parsed && typeof parsed.site === "object" ? parsed.site : null;
  } catch {
    // No file for this language, or an unreadable one: the theme simply does
    // not translate it, and English stands in.
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
  const english = (await readSiteBlock(read, "en")) || {};
  const out = { en: english };

  for (const language of languages) {
    if (!language || language === "en") continue;
    const own = await readSiteBlock(read, language);
    out[language] = own ? merge(english, own) : english;
  }
  return out;
}

/** A reader over a storage adapter, which is what every scoped caller has. */
export const readerFor = (storage, scope) => (relPath) => storage.read(scope, relPath);
