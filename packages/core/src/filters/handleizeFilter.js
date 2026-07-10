import slugify from "slugify";

/**
 * handleize
 *
 * Converts a string to a URL/form-safe handle (kebab-case). Non-Latin scripts
 * (Greek, Cyrillic, …) are *transliterated* to their Latin equivalents rather
 * than stripped, so "Το όνομα σας" -> "to-onoma-sas" instead of "".
 *
 * Uses the same `slugify` settings as page/project slugs (see
 * editor-ui/src/utils/slugUtils.js and builder-server/src/utils/slugHelpers.js)
 * so form field keys behave exactly like the rest of the app's slugs.
 *
 * Returns "" when the input has no transliterable letters or digits (e.g. CJK,
 * emoji, punctuation-only). Callers that need a guaranteed non-empty identifier
 * layer their own positional fallback on top — see formsManifestService.js and
 * the core-form widget.liquid, which both key off this exact function.
 *
 * Usage: {{ "My Option" | handleize }}   -> "my-option"
 *        {{ "Το όνομα σας" | handleize }} -> "to-onoma-sas"
 */
export function handleize(str) {
  if (!str || typeof str !== "string") return "";
  return slugify(str, { lower: true, strict: true, trim: true });
}

export function registerHandleizeFilter(engine) {
  engine.registerFilter("handleize", handleize);
}
