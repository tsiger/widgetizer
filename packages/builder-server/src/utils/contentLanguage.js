import { LANGUAGE_CODE_RE, normalizeLanguageCode } from "@widgetizer/core/languages";
import { languageFolder, resolveLanguage } from "@widgetizer/core/contentAddress";

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
      message: `Language "${requested || language}" is not enabled for this project.`,
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
