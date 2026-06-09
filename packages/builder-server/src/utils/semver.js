/**
 * Semver utility functions for theme version comparison.
 * Uses numeric comparison (not lexicographic) for proper version ordering.
 */

/**
 * Parse a semver string into its components.
 * @param {string} version - Version string (e.g., "1.2.3")
 * @returns {{ major: number, minor: number, patch: number } | null}
 */
export function parseVersion(version) {
  if (!version || typeof version !== "string") {
    return null;
  }

  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Validate that a string is a valid semver format.
 * @param {string} version - Version string to validate
 * @returns {boolean}
 */
export function isValidVersion(version) {
  return parseVersion(version) !== null;
}

/**
 * Compare two semver versions.
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {number} - Negative if a < b, positive if a > b, 0 if equal
 */
export function compareVersions(a, b) {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  // Handle invalid versions - push them to the end
  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return 1;
  if (!parsedB) return -1;

  // Compare major
  if (parsedA.major !== parsedB.major) {
    return parsedA.major - parsedB.major;
  }

  // Compare minor
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor - parsedB.minor;
  }

  // Compare patch
  return parsedA.patch - parsedB.patch;
}

/**
 * Check if a version is newer than another.
 * @param {string} current - Current version
 * @param {string} available - Available version to compare
 * @returns {boolean} - True if available is newer than current
 */
export function isNewerVersion(current, available) {
  return compareVersions(available, current) > 0;
}

/**
 * Sort an array of version strings in ascending order.
 * @param {string[]} versions - Array of version strings
 * @returns {string[]} - Sorted array (ascending)
 */
export function sortVersions(versions) {
  return [...versions].sort(compareVersions);
}

/**
 * Get the latest version from an array of versions.
 * @param {string[]} versions - Array of version strings
 * @returns {string | null} - Latest version or null if empty/invalid
 */
export function getLatestVersion(versions) {
  if (!versions || versions.length === 0) {
    return null;
  }

  const sorted = sortVersions(versions);
  return sorted[sorted.length - 1];
}
