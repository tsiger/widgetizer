/**
 * Escape special regex characters in a string.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate a "Copy of X" or "Copy N of X" name for duplicates.
 * @param {string} originalName - The original item name
 * @param {string[]} existingNames - Array of existing names to check against
 * @returns {string} The new copy name
 */
export function generateCopyName(originalName, existingNames) {
  let baseName = originalName.replace(/^Copy( \d+)? of /, "");
  const copyRegex = new RegExp(`^Copy( (\\d+))? of ${escapeRegex(baseName)}$`);

  let copyNumber = 0;
  existingNames.forEach((name) => {
    const match = name.match(copyRegex);
    if (match) {
      const num = match[2] ? parseInt(match[2]) : 1;
      copyNumber = Math.max(copyNumber, num);
    }
  });

  return copyNumber === 0
    ? `Copy of ${baseName}`
    : `Copy ${copyNumber + 1} of ${baseName}`;
}
