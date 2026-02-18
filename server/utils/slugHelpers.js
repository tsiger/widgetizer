import slugify from "slugify";

/**
 * Generate a unique slug by appending counters until no conflict exists.
 * @param {string} baseName - The name to slugify
 * @param {function} existsCheck - Async function that returns true if slug exists
 * @param {object} options - Options: maxAttempts, fallback
 * @returns {Promise<string>} Unique slug
 */
export async function generateUniqueSlug(baseName, existsCheck, options = {}) {
  const { maxAttempts = 1000, fallback = "item" } = options;
  let baseSlug = slugify(baseName, { lower: true, strict: true });
  if (!baseSlug) baseSlug = fallback;

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
