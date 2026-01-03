import slugify from "slugify";

/**
 * Generates a URL-safe slug from a string.
 *
 * This utility describes the standard "slugification" logic used across the app for:
 * 1. Project Folder Names (e.g. data/projects/my-project)
 * 2. Page Filenames/Slugs (e.g. my-page.html)
 */
export const formatSlug = (value) => {
  return slugify(value, {
    lower: true,
    strict: true,
    trim: true,
  });
};
