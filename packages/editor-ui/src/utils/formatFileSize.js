/**
 * Format a byte count as a short human-readable size (B / KB / MB).
 * Returns an em dash for null/undefined (e.g. an export whose directory is gone).
 *
 * @param {number|null|undefined} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
