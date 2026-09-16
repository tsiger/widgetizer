/**
 * Site-language rules, shared by the project form and the API so both reject
 * the same values. This is the *visitor-facing* site language — it has nothing
 * to do with the language of the editor interface.
 */

/** The language every project starts with, and what existing projects migrate to. */
export const DEFAULT_LANGUAGE = "en";

/**
 * Codes are simple ISO 639-1 in the UI (`en`, `el`), but validation accepts a
 * wider BCP 47 subset so a regional code like `pt-br` needs no migration later.
 * Stored and path-built in lowercase; canonical casing is emitted on output.
 */
export const LANGUAGE_CODE_RE = /^[a-z]{2}(-[a-z0-9]{2,8})?$/;

/**
 * Right-to-left languages are out of scope for v1: they need `dir="rtl"`
 * plumbing and theme work. They are absent from the picker *and* refused by the
 * API — hiding an option is not enforcement.
 *
 * Two-letter codes whose default script is right-to-left (CLDR), legacy codes
 * included. A language written RTL only in some places (`pa-arab`, `pa-pk`) is
 * caught by the effective script instead — see `effectiveScript`.
 */
export const RTL_LANGUAGES = new Set(["ar", "dv", "fa", "he", "iw", "ji", "ks", "ps", "sd", "ug", "ur", "yi"]);

/** Right-to-left script subtags (CLDR), which override the base language's default. */
export const RTL_SCRIPTS = new Set([
  "adlm", "arab", "aran", "armi", "avst", "cprt", "elym", "hatr", "hebr", "hung", "khar", "lydi",
  "mand", "mani", "mend", "merc", "mero", "narb", "nbat", "nkoo", "orkh", "palm", "phli", "phlp",
  "phnx", "prti", "rohg", "samr", "sarb", "sogd", "sogo", "syrc", "thaa", "yezi",
]);

/**
 * Language + region pairs that resolve to a script other than the language's own
 * default (CLDR likely subtags), listed only where that changes the writing
 * direction: `pa` is Gurmukhi and left-to-right, but `pa-pk` is Arabic and
 * right-to-left; `sd` is Arabic, but `sd-in` is Devanagari.
 */
// BCP 47 subtag shapes. The code regex above accepts any alphanumeric subtag, so
// these tell a script from a region from a variant: `zh-hans` is a script,
// `pa-pk` a region, `ar-1994` a variant (which says nothing about direction).
const SCRIPT_SUBTAG_RE = /^[a-z]{4}$/;
const REGION_SUBTAG_RE = /^[a-z]{2}$/;
const NUMERIC_REGION_RE = /^[0-9]{3}$/;

const REGION_SCRIPTS = new Map([
  ["az-ir", "arab"],
  ["kk-cn", "arab"],
  ["ky-cn", "arab"],
  ["ms-cc", "arab"],
  ["pa-pk", "arab"],
  ["uz-af", "arab"],
  ["sd-in", "deva"],
]);

/** Selectable languages, in their own names, ordered by English name. */
export const SUPPORTED_LANGUAGES = [
  { code: "sq", name: "Shqip" },
  { code: "hy", name: "Հայերեն" },
  { code: "bs", name: "Bosanski" },
  { code: "bg", name: "Български" },
  { code: "ca", name: "Català" },
  { code: "zh", name: "中文" },
  { code: "hr", name: "Hrvatski" },
  { code: "cs", name: "Čeština" },
  { code: "da", name: "Dansk" },
  { code: "nl", name: "Nederlands" },
  { code: "en", name: "English" },
  { code: "et", name: "Eesti" },
  { code: "fi", name: "Suomi" },
  { code: "fr", name: "Français" },
  { code: "ka", name: "ქართული" },
  { code: "de", name: "Deutsch" },
  { code: "el", name: "Ελληνικά" },
  { code: "hi", name: "हिन्दी" },
  { code: "hu", name: "Magyar" },
  { code: "is", name: "Íslenska" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ga", name: "Gaeilge" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "lv", name: "Latviešu" },
  { code: "lt", name: "Lietuvių" },
  { code: "mk", name: "Македонски" },
  { code: "ms", name: "Bahasa Melayu" },
  { code: "mt", name: "Malti" },
  { code: "no", name: "Norsk" },
  { code: "pl", name: "Polski" },
  { code: "pt", name: "Português" },
  { code: "ro", name: "Română" },
  { code: "ru", name: "Русский" },
  { code: "sr", name: "Српски" },
  { code: "sk", name: "Slovenčina" },
  { code: "sl", name: "Slovenščina" },
  { code: "es", name: "Español" },
  { code: "sv", name: "Svenska" },
  { code: "th", name: "ไทย" },
  { code: "tr", name: "Türkçe" },
  { code: "uk", name: "Українська" },
  { code: "vi", name: "Tiếng Việt" },
];

const NATIVE_NAMES = new Map(SUPPORTED_LANGUAGES.map(({ code, name }) => [code, name]));

/** Lowercase and trim a code the way it is stored. Non-strings become "". */
export function normalizeLanguageCode(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Whether a code is storable: right shape, and not one we refuse to support. */
export function isValidLanguageCode(value) {
  const code = normalizeLanguageCode(value);
  return LANGUAGE_CODE_RE.test(code) && !hasNumericRegion(code) && !isRtlLanguage(code);
}

/**
 * The script a code is actually written in: the subtag when it names one, else
 * the script the region implies. Empty when only the base language decides.
 */
export function effectiveScript(value) {
  const [base, subtag] = normalizeLanguageCode(value).split("-");
  if (!base || !subtag) return "";
  if (SCRIPT_SUBTAG_RE.test(subtag)) return subtag;
  if (REGION_SUBTAG_RE.test(subtag)) return REGION_SCRIPTS.get(`${base}-${subtag}`) ?? "";
  return "";
}

/**
 * Whether a code names its region as a UN M.49 number (`pa-586`) rather than a
 * country code. Legal BCP 47, but resolving the script behind one needs a region
 * table this version does not ship, so such a code is refused rather than
 * guessed at — `pa-586` is Punjabi in Pakistan, which is right-to-left.
 */
export function hasNumericRegion(value) {
  const subtag = normalizeLanguageCode(value).split("-")[1];
  return subtag ? NUMERIC_REGION_RE.test(subtag) : false;
}

/**
 * Whether a code is written right-to-left. The effective script decides when
 * there is one — `pa` and `pa-in` are left-to-right, `pa-arab` and `pa-pk` are
 * not — and the base language decides otherwise.
 */
export function isRtlLanguage(value) {
  const script = effectiveScript(value);
  if (script) return RTL_SCRIPTS.has(script);
  return RTL_LANGUAGES.has(normalizeLanguageCode(value).split("-")[0]);
}

/** The `dir` attribute for a code. RTL is unsupported in v1, so this is "ltr". */
export function languageDir(value) {
  return isRtlLanguage(value) ? "rtl" : "ltr";
}

/**
 * Canonical BCP 47 casing for `lang` / `hreflang` output: `pt-br` → `pt-BR`,
 * `zh-hans` → `zh-Hans`. Storage and paths stay lowercase.
 */
export function hreflangCase(value) {
  const code = normalizeLanguageCode(value);
  if (!code) return "";
  const [base, ...subtags] = code.split("-");
  return [
    base,
    ...subtags.map((tag) => {
      if (tag.length === 2) return tag.toUpperCase();
      if (tag.length === 4) return tag[0].toUpperCase() + tag.slice(1);
      return tag;
    }),
  ].join("-");
}

/**
 * The language's name in its own language, for the picker and the switcher.
 * A regional code falls back to its base language, then to the code itself.
 */
export function nativeLanguageName(value) {
  const code = normalizeLanguageCode(value);
  if (!code) return "";
  const base = code.split("-")[0];
  const name = NATIVE_NAMES.get(code) ?? NATIVE_NAMES.get(base);
  if (!name) return hreflangCase(code);
  return code === base ? name : `${name} (${hreflangCase(code).split("-").slice(1).join("-")})`;
}
