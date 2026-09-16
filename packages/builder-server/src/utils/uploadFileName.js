import path from "path";
import slugify from "slugify";

export const MAX_UPLOAD_NAME_LENGTH = 60;

/**
 * Turn an uploaded file's own name into the name it is stored under: lower case,
 * hyphen-separated, ASCII only (slugify transliterates Greek, Cyrillic, accents and
 * the like; scripts it cannot transliterate, e.g. CJK, fall back to `fallback`).
 *
 * The stored charset is a contract, not cosmetics: `sanitizationService`'s image-path
 * allowlist and the media scanner both assume `[a-z0-9-]` plus a lower-case extension.
 *
 * @param {string} originalName - the name as uploaded (already decoded to UTF-8)
 * @param {{ fallback?: string, maxLength?: number }} [options]
 * @returns {string} the stored file name, extension included
 */
export function normalizeUploadName(originalName, { fallback = "file", maxLength = MAX_UPLOAD_NAME_LENGTH } = {}) {
  // NFC first: decomposed input (e.g. macOS "Mu" + combining diaeresis) would otherwise
  // split at the combining mark and yield "mu-ller" where NFC input yields "muller".
  const rawName = (typeof originalName === "string" ? originalName : "").normalize("NFC");
  const rawExtension = path.extname(rawName);
  const extensionSlug = slugify(rawExtension.slice(1), { lower: true, strict: true, trim: true });
  const extension = extensionSlug ? `.${extensionSlug}` : "";

  // Every non-letter, non-digit is a word separator. slugify(strict) would DROP them
  // instead, gluing words together (`filename_like_that` -> `filenamelikethat`).
  const words = path.basename(rawName, rawExtension).replace(/[^\p{L}\p{N}]+/gu, " ");
  let base = slugify(words, { lower: true, strict: true, trim: true });

  if (base.length > maxLength) {
    base = base.slice(0, maxLength);
    const lastHyphen = base.lastIndexOf("-");
    if (lastHyphen > maxLength * 0.6) base = base.slice(0, lastHyphen);
  }
  base = base.replace(/^-+|-+$/g, "");

  return `${base || fallback}${extension}`;
}
