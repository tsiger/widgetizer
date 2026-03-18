/**
 * Validates an array of File objects against configurable size limits before upload.
 *
 * @param {File[]} files - The files to validate
 * @param {{ maxImageMB: number }} limits
 * @returns {{ valid: File[], rejected: { originalName: string, reason: string }[] }}
 */
export function validateFileSizes(files, { maxImageMB }) {
  const valid = [];
  const rejected = [];

  for (const file of files) {
    if (maxImageMB != null && file.size > maxImageMB * 1024 * 1024) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      rejected.push({
        originalName: file.name,
        reason: `File is too large (${fileSizeMB}MB). Maximum allowed size is ${maxImageMB}MB.`,
      });
    } else {
      valid.push(file);
    }
  }

  return { valid, rejected };
}
