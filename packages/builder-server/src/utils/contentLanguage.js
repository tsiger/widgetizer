import { LANGUAGE_CODE_RE, nativeLanguageName, normalizeLanguageCode } from "@widgetizer/core/languages";
import { languageFolder, resolveLanguage } from "@widgetizer/core/contentAddress";

/**
 * A language's English name for a server message — "Greek", not "el". Messages
 * are English sentences, and a bare code is an internal detail nobody chose.
 * Falls back to the native name, then to the code, so it never comes back empty.
 */
export function languageNameForMessage(code) {
  if (!code) return "";
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    // `of` echoes the input back when it knows no name for it.
    if (name && name.toLowerCase() !== String(code).toLowerCase()) return name;
  } catch {
    // A code Intl refuses — fall through.
  }
  return nativeLanguageName(code) || code;
}

/** A row from before the languages setting existed reads as single-language. */
export function projectLanguages(project) {
  const defaultLanguage = resolveLanguage("", project?.defaultLanguage);
  const languages = Array.isArray(project?.languages)
    ? project.languages.map(normalizeLanguageCode).filter(Boolean)
    : [];
  return { defaultLanguage, languages };
}

/** One `{ language, defaultLanguage, languages }` per site language, the default first. */
export function projectLanguageContexts(project) {
  const { defaultLanguage, languages } = projectLanguages(project);
  return [defaultLanguage, ...languages].map((language) => ({ language, defaultLanguage, languages }));
}

/**
 * The language a request addresses (`?language=` or `body.language`; the default
 * when absent), or null after a 400 for a language the project has not enabled,
 * so no handler ever creates a folder for one.
 */
export function requestLanguage(req, res) {
  const { defaultLanguage, languages } = projectLanguages(req.activeProject);
  const requested = normalizeLanguageCode(req.query?.language ?? req.body?.language ?? "");
  const language = resolveLanguage(requested, defaultLanguage);
  const lang = { language, defaultLanguage, languages };

  // Malformed first and on its own: `languageFolder` refuses to build a path from a
  // code like "not-a-language", so asking it about one throws. The original `||`
  // short-circuited past it; keep that order.
  const malformed = Boolean(requested) && !LANGUAGE_CODE_RE.test(requested);
  const notEnabled = !malformed && Boolean(languageFolder(lang)) && !languages.includes(language);
  if (malformed || notEnabled) {
    res.status(400).json({
      error: "Unknown language",
      message: malformed
        ? `Language "${requested}" is not enabled for this project.`
        : `${languageNameForMessage(language)} is not enabled for this project.`,
      // A well-formed language the project does not have is, from an editor's point
      // of view, the same event as one removed mid-edit: this work cannot be saved
      // anywhere. It carries the same code so the editor reacts the same way —
      // stop retrying, keep the edits, explain — whether the request validated
      // against a stale project row (caught inside the write section) or a fresh
      // one (caught here). Without the code this path answered a bare 400 and the
      // recovery never ran, which is the far more common ordering of the two.
      ...(malformed ? {} : { code: "LANGUAGE_REMOVED", language }),
    });
    return null;
  }
  return lang;
}

/**
 * The language a caller outside a request asks for (the default when absent), or a
 * LANGUAGE_UNKNOWN error naming the site's languages. Same rules as
 * `requestLanguage`, which keeps its own HTTP answer for the editor.
 */
export function contentLanguage(project, code) {
  const { defaultLanguage, languages } = projectLanguages(project);
  const requested = normalizeLanguageCode(code ?? "");
  const language = resolveLanguage(requested, defaultLanguage);
  const lang = { language, defaultLanguage, languages };
  const malformed = Boolean(requested) && !LANGUAGE_CODE_RE.test(requested);
  if (malformed || (Boolean(languageFolder(lang)) && !languages.includes(language))) {
    const available = [defaultLanguage, ...languages].join(", ");
    throw Object.assign(new Error(`Language "${requested}" isn't on this site. Its languages are: ${available}.`), {
      code: "LANGUAGE_UNKNOWN",
    });
  }
  return lang;
}

/** The language folders present under a content directory, for scans that must touch every file. */
export async function languageFoldersIn(storage, scope, dir) {
  const entries = await storage.list(scope, dir);
  return entries.filter((name) => LANGUAGE_CODE_RE.test(name)).sort();
}

/** The persisted form of a model: the folder says the language, so the file never does. */
export function withoutLanguage(model) {
  const persisted = { ...model };
  delete persisted.language;
  return persisted;
}
