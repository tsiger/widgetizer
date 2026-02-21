/**
 * Validates an array of File objects against configurable size limits before upload.
 *
 * @param {File[]} files - The files to validate
 * @param {{ maxImageMB: number, maxVideoMB: number, maxAudioMB: number }} limits
 * @returns {{ valid: File[], rejected: { originalName: string, reason: string }[] }}
 */
export function validateFileSizes(files, { maxImageMB, maxVideoMB, maxAudioMB }) {
  const valid = [];
  const rejected = [];

  for (const file of files) {
    let limitMB;

    if (file.type.startsWith("video/")) {
      limitMB = maxVideoMB;
    } else if (file.type.startsWith("audio/")) {
      limitMB = maxAudioMB;
    } else {
      limitMB = maxImageMB;
    }

    if (limitMB != null && file.size > limitMB * 1024 * 1024) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      rejected.push({
        originalName: file.name,
        reason: `File is too large (${fileSizeMB}MB). Maximum allowed size is ${limitMB}MB.`,
      });
    } else {
      valid.push(file);
    }
  }

  return { valid, rejected };
}
