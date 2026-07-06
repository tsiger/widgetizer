// Dir-explicit project-content readers.
//
// Pure FS transforms over a caller-supplied project working directory: no
// DATA_DIR reach-through, no SQLite, no scope, no permanence assumption — the
// caller owns where the directory comes from and how long it lives (the
// working-directory contract). These are the OSS-internal counterparts of the
// request-boundary StorageAdapter reads: the scope-free render path (engine
// deps, preview/export) reads content through these; the API boundary reads the
// same files per-key through the adapter.
//
// Behaviour mirrors the folderName-based readers they replace — listProjectPagesData
// / readGlobalWidgetData in pageController, and the read half of readProjectThemeData
// in themeController — minus the config.getProjectDir(folderName) reach-through.
import fs from "fs-extra";
import path from "path";

/**
 * Lists and parses every publishable page in `<projectDir>/pages`.
 * @param {string} projectDir - Absolute path to the project working directory.
 * @returns {Promise<Array<object>>} Parsed page objects, each with `id` set from
 *   its filename. Returns [] when the pages directory does not exist; skips files
 *   that fail to read/parse.
 * @throws {Error} If the pages directory exists but cannot be read.
 */
export async function listPagesFromDir(projectDir) {
  const pagesDir = path.join(projectDir, "pages");
  try {
    if (!(await fs.pathExists(pagesDir))) {
      return []; // No pages directory yet — same empty-list contract as before.
    }
    // withFileTypes so the `global/` subdir (and any other dirs) drop out via isFile().
    const allEntries = await fs.readdir(pagesDir, { withFileTypes: true });
    const pageFiles = allEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

    const pagesData = await Promise.all(
      pageFiles.map(async (fileEntry) => {
        const pageId = fileEntry.name.replace(".json", "");
        const pagePath = path.join(pagesDir, fileEntry.name);
        try {
          const pageContent = await fs.readFile(pagePath, "utf8");
          const parsedData = JSON.parse(pageContent);
          // id is authoritative from the filename, overriding any stale id in the file.
          return { ...parsedData, id: pageId };
        } catch (readError) {
          console.error(`Error reading or parsing page file ${pagePath}:`, readError);
          return null; // Skip a single unreadable/unparseable page, keep the rest.
        }
      }),
    );

    return pagesData.filter((page) => page !== null);
  } catch (error) {
    console.error(`Error listing pages data in ${pagesDir}:`, error);
    throw new Error(`Failed to list pages data in ${pagesDir}: ${error.message}`);
  }
}

/**
 * Reads a global widget (header/footer) JSON from `<projectDir>/pages/global`.
 * @param {string} projectDir - Absolute path to the project working directory.
 * @param {'header'|'footer'} widgetType
 * @returns {Promise<object|null>} Parsed widget data with `type` injected, or null
 *   for an invalid type, a missing file, or a read/parse error.
 */
export async function readGlobalWidgetFromDir(projectDir, widgetType) {
  if (widgetType !== "header" && widgetType !== "footer") {
    console.error(`Invalid global widget type requested: ${widgetType}`);
    return null;
  }
  const globalWidgetPath = path.join(projectDir, "pages", "global", `${widgetType}.json`);
  try {
    if (!(await fs.pathExists(globalWidgetPath))) {
      return null;
    }
    const widgetContent = await fs.readFile(globalWidgetPath, "utf-8");
    const widgetData = JSON.parse(widgetContent);
    widgetData.type = widgetType; // Make the type explicit even if absent in the file.
    return widgetData;
  } catch (error) {
    console.error(`Error reading global widget data (${widgetType}) in ${projectDir}:`, error);
    return null;
  }
}

/**
 * Reads and parses `<projectDir>/theme.json`. Strict by design: throws when the
 * file is missing so the render path surfaces a corrupt/absent theme rather than
 * silently masking it.
 * @param {string} projectDir - Absolute path to the project working directory.
 * @returns {Promise<object>} The parsed theme settings object.
 * @throws {Error} If theme.json does not exist or cannot be read/parsed.
 */
export async function readThemeDataFromDir(projectDir) {
  const themeFile = path.join(projectDir, "theme.json");
  try {
    await fs.access(themeFile);
    const themeDataStr = await fs.readFile(themeFile, "utf8");
    return JSON.parse(themeDataStr);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Theme settings file not found at ${themeFile}.`);
    }
    throw new Error(`Failed to read or parse theme settings at ${themeFile}: ${error.message}`);
  }
}
