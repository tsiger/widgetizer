import fs from "fs-extra";
import path from "path";
import { isSafePathSegment } from "./pathSecurity.js";

/**
 * Recursively walk a theme templates directory, read each JSON template,
 * resolve its slug, and hand it to `processor` for writing.
 *
 * @param {string} sourceDir - Theme templates source directory
 * @param {string} targetDir - Project pages target directory
 * @param {(template: object, slug: string, targetPath: string, where: { relativeDir: string }) => Promise<void>} processor
 *   Callback that decides how to initialise and write each template. `relativeDir`
 *   is the template's folder under the templates root ("" for a page, "global",
 *   "global/areas"), so a caller can tell a page from a global or an area.
 * @param {string} [relativeDir] - Internal: the folder being walked, relative to the root
 */
export async function processTemplatesRecursive(sourceDir, targetDir, processor, relativeDir = "") {
  if (!(await fs.pathExists(sourceDir))) return;
  await fs.ensureDir(targetDir);

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);

    if (entry.isDirectory()) {
      const targetSubDir = path.join(targetDir, entry.name);
      await processTemplatesRecursive(
        sourcePath,
        targetSubDir,
        processor,
        relativeDir ? `${relativeDir}/${entry.name}` : entry.name,
      );
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const templateContent = await fs.readJson(sourcePath);
      // The slug names the page file this writes, in a new project and on a theme
      // update. A theme can come from anywhere, so a stored slug that is not a
      // single name (`../../elsewhere/theme`) gives way to the file's own name.
      const templateSlug = isSafePathSegment(templateContent.slug)
        ? templateContent.slug
        : path.basename(entry.name, ".json");
      const targetPath = path.join(targetDir, `${templateSlug}.json`);

      await processor(templateContent, templateSlug, targetPath, { relativeDir });
    }
  }
}

/**
 * Starting content for the shared areas a preset does not supply itself. A preset
 * with its own templates replaces the theme's pages, but an area the preset says
 * nothing about still starts with the theme's content. Writes only areas missing
 * from `pagesDir`, so a preset's own file always wins.
 * @param {string} themeTemplatesDir - The theme's own templates/ directory
 * @param {string} pagesDir - The project's pages/ directory
 * @param {(template: object) => object} toArea - Turns a template into the stored area
 * @returns {Promise<string[]>} Paths written, relative to `pagesDir`
 */
export async function copyMissingAreaTemplates(themeTemplatesDir, pagesDir, toArea) {
  const sourceDir = path.join(themeTemplatesDir, "global", "areas");
  if (!(await fs.pathExists(sourceDir))) return [];
  const written = [];
  for (const name of await fs.readdir(sourceDir)) {
    if (!name.endsWith(".json")) continue;
    const target = path.join(pagesDir, "global", "areas", name);
    if (await fs.pathExists(target)) continue;
    await fs.outputFile(target, JSON.stringify(toArea(await fs.readJson(path.join(sourceDir, name))), null, 2));
    written.push(path.join("global", "areas", name));
  }
  return written;
}
