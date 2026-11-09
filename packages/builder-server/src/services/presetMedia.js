// A preset's starter media, registered in a new project's media library.
import { randomUUID } from "node:crypto";
import * as mediaRepo from "../db/repositories/mediaRepository.js";

/**
 * Register a preset's starter images in a new project's media library, one record
 * per entry of its media manifest (`media/manifest.json`, `{ files: [...] }`), each
 * with a fresh, project-scoped id. An entry without a filename is skipped. The
 * binaries are the caller's to put in the project's uploads first (copied to disk,
 * or uploaded through an asset adapter), under the paths the entries name; reading
 * the manifest is the caller's too.
 * @param {string} projectId  the project's id (media_files.project_id)
 * @param {{ files?: Array<object> }} manifest  the parsed manifest
 */
export function registerPresetMedia(projectId, manifest) {
  const now = new Date().toISOString();
  for (const entry of manifest.files || []) {
    if (!entry.filename) continue;
    mediaRepo.addMediaFile(projectId, {
      id: randomUUID(),
      filename: entry.filename,
      originalName: entry.originalName || entry.filename,
      type: entry.type || "",
      size: entry.size || 0,
      uploaded: now,
      path: entry.path || `/uploads/images/${entry.filename}`,
      width: entry.width || null,
      height: entry.height || null,
      metadata: { alt: entry.alt || "", title: entry.title || "", caption: entry.caption || "" },
      sizes: entry.sizes || {},
    });
  }
}
