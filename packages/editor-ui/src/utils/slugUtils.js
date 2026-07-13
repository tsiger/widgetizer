import slugify from "slugify";

/**
 * Generates a URL-safe slug from a string.
 *
 * This utility describes the standard "slugification" logic used across the app for:
 * 1. Project Folder Names (e.g. data/projects/my-project)
 * 2. Page Filenames/Slugs (e.g. my-page.html)
 */
export const formatSlug = (value) => {
  // Strip HTML tags before slugifying so "<script>alert()</script>" doesn't
  // produce garbage like "scriptalertscript" in the slug.
  const stripped = value.replace(/<[^>]*>/g, "");
  return slugify(stripped, {
    lower: true,
    strict: true,
    trim: true,
  });
};
