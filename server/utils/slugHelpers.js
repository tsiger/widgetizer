import slugify from "slugify";

/**
 * Sanitize a raw string into a URL/filesystem-safe slug.
 * This is the single backend authority for slug normalization rules.
 * @param {string} value - The raw string to sanitize
 * @param {string} [fallback] - Returned if the sanitized result is empty
 * @returns {string} Sanitized slug
 */
export function sanitizeSlug(value, fallback = "") {
  if (!value || typeof value !== "string") return fallback;
  const slug = slugify(value, { lower: true, strict: true });
  return slug || fallback;
}

/**
 * Generate a unique slug by appending counters until no conflict exists.
 * @param {string} baseName - The name to slugify
 * @param {function} existsCheck - Async function that returns true if slug exists
 * @param {object} options - Options: maxAttempts, fallback
 * @returns {Promise<string>} Unique slug
 */
export async function generateUniqueSlug(baseName, existsCheck, options = {}) {
  const { maxAttempts = 1000, fallback = "item" } = options;
  const baseSlug = sanitizeSlug(baseName, fallback);

  let uniqueSlug = baseSlug;
  let counter = 1;

  while (await existsCheck(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > maxAttempts) {
      throw new Error(`Unable to generate unique slug after ${maxAttempts} attempts`);
    }
  }
  return uniqueSlug;
}
