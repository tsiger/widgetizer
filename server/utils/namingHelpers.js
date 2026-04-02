/**
 * Escape special regex characters in a string.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate an "X (Copy)" or "X (Copy N)" name for duplicates.
 * @param {string} originalName - The original item name
 * @param {string[]} existingNames - Array of existing names to check against
 * @returns {string} The new copy name
 */
export function generateCopyName(originalName, existingNames) {
  const baseName = originalName.replace(/\s+\(Copy(?: (\d+))?\)$/, "");
  const copyRegex = new RegExp(`^${escapeRegex(baseName)} \\(Copy(?: (\\d+))?\\)$`);

  let copyNumber = 0;
  existingNames.forEach((name) => {
    const match = name.match(copyRegex);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      copyNumber = Math.max(copyNumber, num);
    }
  });

  return copyNumber === 0 ? `${baseName} (Copy)` : `${baseName} (Copy ${copyNumber + 1})`;
}
