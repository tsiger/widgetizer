/**
 * Centralized MIME type definitions and helpers.
 *
 * All extension-to-MIME mappings, allowed upload types, and MIME
 * classification logic live here so the rest of the codebase can
 * import from a single source of truth.
 */

// ---------------------------------------------------------------------------
// Extension → MIME mapping (superset used for serving static files)
// ---------------------------------------------------------------------------

const CONTENT_TYPES = {
  // Documents
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",

  // Images
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",

  // Video
  ".mp4": "video/mp4",

  // Audio
  ".mp3": "audio/mpeg",

  // Fonts
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

/**
 * Resolve a file extension to its MIME type.
 * @param {string} ext  Lowercase extension including the dot, e.g. ".png"
 * @param {string} [fallback="application/octet-stream"]
 * @returns {string}
 */
export function getContentType(ext, fallback = "application/octet-stream") {
  return CONTENT_TYPES[ext] || fallback;
}

// ---------------------------------------------------------------------------
// Upload validation
// ---------------------------------------------------------------------------

/** MIME types accepted for media uploads (images, video, audio). */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "audio/mpeg",
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
 * @returns {"video"|"audio"|"image"}
 */
export function getMediaCategory(mimeType) {
  if (mimeType && mimeType.startsWith("video/")) return "video";
  if (mimeType && mimeType.startsWith("audio/")) return "audio";
  return "image";
}
