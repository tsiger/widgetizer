/**
 * MIME helpers for builder-server.
 *
 * The extension→MIME map and `getContentType` now live in @widgetizer/core
 * (the single source of truth shared with the local asset adapter, which had
 * drifted from this copy). Re-exported here so this module's many importers
 * don't churn. The upload-validation constants and classification below are
 * builder-server concerns and stay here.
 */
export { CONTENT_TYPES, getContentType } from "@widgetizer/core/mimeTypes";

// ---------------------------------------------------------------------------
// Upload validation
// ---------------------------------------------------------------------------

/** MIME types accepted for media uploads. */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  // Audio. `audio/mpeg` is the standard for .mp3; some browsers/OSes report `audio/mp3`.
  "audio/mpeg",
  "audio/mp3",
];

/** MIME types that indicate a ZIP archive (used for theme / project imports). */
export const ZIP_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
];

// ---------------------------------------------------------------------------
// MIME classification
// ---------------------------------------------------------------------------

/**
 * Classify a MIME type into a media category.
 * @param {string} mimeType
 * @returns {"image" | "file"}
 */
export function getMediaCategory(mimeType) {
  if (mimeType && mimeType.startsWith("image/")) {
    return "image";
  }
  return "file";
}
