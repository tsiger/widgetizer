/**
 * Canonical extension → MIME mapping, shared by both shells.
 *
 * This is the single source of truth for static-file content types shared by
 * builder-server and the local asset adapter. Keep additions here, not in a
 * consumer's private copy.
 *
 * Pure data + a lookup; no Node APIs, so it is safe to import anywhere.
 */
export const CONTENT_TYPES = {
  // Documents
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".pdf": "application/pdf",

  // Images
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",

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
