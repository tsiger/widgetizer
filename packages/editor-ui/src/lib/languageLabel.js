import { nativeLanguageName } from "@widgetizer/core/languages";

/**
 * A language's name for someone reading the editor — "Greek", not "el".
 *
 * Distinct from `nativeLanguageName`, which answers in the language's OWN language
 * ("Ελληνικά"). That is right for a picker or a public switcher, where the reader is
 * looking for their own language. It is wrong inside an English sentence explaining
 * what went wrong, where the reader may not read that script at all — and a bare
 * code is worse than either, because it is an internal detail nobody chose.
 *
 * Falls back to the native name, then to the code, so this can never render empty.
 *
 * @param {string} code a language code, e.g. "el" or "pt-br"
 * @param {string} [uiLocale] the locale to name it in; defaults to the browser's
 * @returns {string}
 */
export function languageLabel(code, uiLocale = undefined) {
  if (!code) return "";
  try {
    const name = new Intl.DisplayNames([uiLocale || navigator?.language || "en"], { type: "language" }).of(code);
    // `of` echoes the input back when it knows no name for it.
    if (name && name.toLowerCase() !== String(code).toLowerCase()) return name;
  } catch {
    // Intl.DisplayNames missing or given a code it refuses — fall through.
  }
  return nativeLanguageName(code) || code;
}
