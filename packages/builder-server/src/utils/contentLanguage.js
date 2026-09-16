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
  if ((requested && !LANGUAGE_CODE_RE.test(requested)) || (languageFolder(lang) && !languages.includes(language))) {
    res.status(400).json({
      error: "Unknown language",
      message: `Language "${requested || language}" is not enabled for this project.`,
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
