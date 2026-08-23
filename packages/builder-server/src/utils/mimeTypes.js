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

/**
 * File extensions accepted for media uploads — mirrors ALLOWED_MIME_TYPES.
 * Acceptance must gate on the extension and require it to match the declared MIME: the
 * multipart Content-Type is client-controlled, storage keeps the original
 * extension, and serving derives the response Content-Type from that stored
 * extension — so a MIME-only check lets a crafted `x.html` upload in and back
 * out as executable text/html.
 */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".pdf",
  ".mp3",
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
