import fs from "fs-extra";
import path from "path";
import { isSafePathSegment } from "./pathSecurity.js";

// Checks on the content of an unpacked project backup, run before anything is
// copied into the new project. A backup is a file anyone can hand the user, so
// what it names (media paths, item slugs, translation languages) is checked
// against what the app itself writes. Each returns a reason to refuse, or null.

const ITEM_SLUG = /^[a-z0-9-]+$/;
// `audios` and `videos` held uploads in versions that accepted audio and video;
// those libraries still carry them, so a backup of one does too.
const UPLOAD_PATH = /^\/uploads\/(images|files|audios|videos)\/([^/]+)$/;

/** A media path as the app stores it: `/uploads/<folder>/<name>`, one file directly in an upload folder. */
function isUploadPath(value, folder) {
  if (typeof value !== "string") return false;
  const match = UPLOAD_PATH.exec(value);
  if (!match || (folder && match[1] !== folder)) return false;
  return isSafePathSegment(match[2]) && !match[2].includes(":");
}

/**
 * The media library's paths and translation languages.
 * @param {object} mediaData - parsed `uploads/media.json` ({ files: [...] })
 * @param {string[]} languages - the project's languages other than the default
 * @returns {string|null}
 */
export function mediaLibraryProblem(mediaData, languages) {
  if (!mediaData || !Array.isArray(mediaData.files)) return null; // the import reports this shape itself
  const allowed = new Set(languages);
  for (const file of mediaData.files) {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      return "the media library contains an entry that does not describe a file.";
    }
    const label = typeof file?.filename === "string" && file.filename ? file.filename : "a file";
    if (!isUploadPath(file.path)) {
      return `the media library lists ${label} at ${JSON.stringify(file.path ?? null)}, outside the project's uploads folder.`;
    }
    for (const [sizeName, size] of Object.entries(file.sizes ?? {})) {
      if (size?.path != null && !isUploadPath(size.path, "images")) {
        return `the media library lists the ${sizeName} size of ${label} at ${JSON.stringify(size.path)}, outside the project's images folder.`;
      }
    }
    for (const language of Object.keys(file.translations ?? {})) {
      if (!allowed.has(language)) {
        return `the media library has ${JSON.stringify(language)} text for ${label}, but the project has no such additional language.`;
      }
    }
  }
  return null;
}

/**
 * Stored content must be readable before import can claim to restore it.
 * Collection item slugs also name their published pages.
 * @param {string} dir - the unpacked backup
 * @returns {Promise<string|null>}
 */
export async function contentFilesProblem(dir) {
  const files = [];
  const walk = async (folder) => {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
    }
  };
  for (const name of ["pages", "menus", "collections"]) {
    const folder = path.join(dir, name);
    if (await fs.pathExists(folder)) await walk(folder);
  }
  const themeFile = path.join(dir, "theme.json");
  if (await fs.pathExists(themeFile)) files.push(themeFile);

  for (const file of files) {
    const where = path.relative(dir, file).split(path.sep).join("/");
    let item;
    try {
      // Not fs.readJson: it strips a byte-order mark that the app's own parse rejects.
      item = JSON.parse((await fs.readFile(file)).toString("utf8"));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return `the content file ${where} is not valid JSON.`;
    }
    if (!where.startsWith("collections/") || path.basename(file) === "_order.json") continue;
    const slug = item?.slug ?? item?.id;
    if (typeof slug !== "string" || !ITEM_SLUG.test(slug)) {
      return `the collection item ${where} has the address ${JSON.stringify(slug ?? null)}, which is not a valid item address.`;
    }
  }
  return null;
}
