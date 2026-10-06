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
 * Every collection item's stored slug, which names its published page.
 * @param {string} dir - the unpacked backup
 * @returns {Promise<string|null>}
 */
export async function collectionItemsProblem(dir) {
  const collectionsDir = path.join(dir, "collections");
  if (!(await fs.pathExists(collectionsDir))) return null;
  const files = [];
  const walk = async (folder) => {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "_order.json") files.push(full);
    }
  };
  await walk(collectionsDir);

  for (const file of files) {
    let item;
    try {
      item = await fs.readJson(file);
    } catch {
      continue; // an unreadable item is skipped when the collection is read, as it always was
    }
    const slug = item?.slug ?? item?.id;
    if (typeof slug !== "string" || !ITEM_SLUG.test(slug)) {
      const where = path.relative(dir, file).split(path.sep).join("/");
      return `the collection item ${where} has the address ${JSON.stringify(slug ?? null)}, which is not a valid item address.`;
    }
  }
  return null;
}
