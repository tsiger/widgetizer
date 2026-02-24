import fs from "fs-extra";
import path from "path";

/**
 * Recursively walk a theme templates directory, read each JSON template,
 * resolve its slug, and hand it to `processor` for writing.
 *
 * @param {string} sourceDir - Theme templates source directory
 * @param {string} targetDir - Project pages target directory
 * @param {(template: object, slug: string, targetPath: string) => Promise<void>} processor
 *   Callback that decides how to initialise and write each template.
 */
export async function processTemplatesRecursive(sourceDir, targetDir, processor) {
  if (!(await fs.pathExists(sourceDir))) return;
  await fs.ensureDir(targetDir);

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);

    if (entry.isDirectory()) {
      const targetSubDir = path.join(targetDir, entry.name);
      await processTemplatesRecursive(sourcePath, targetSubDir, processor);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const templateContent = await fs.readJson(sourcePath);
      const templateSlug = templateContent.slug || path.basename(entry.name, ".json");
      const targetPath = path.join(targetDir, `${templateSlug}.json`);

      await processor(templateContent, templateSlug, targetPath);
    }
  }
}
