/**
 * MIME helpers for builder-server.
 *
 * The extension-to-MIME map and `getContentType` come from @widgetizer/core,
 * the shared source of truth for server and adapter content types. The
 * upload-validation constants and classification below are builder-server
 * concerns and stay here.
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
