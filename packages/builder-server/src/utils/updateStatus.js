import { isNewerVersion, isValidVersion } from "./semver.js";

/**
 * Derive an update-status object from a current and available version.
 * Centralizes the repeated "compare if both versions exist, otherwise
 * fall back gracefully" logic used across project and theme update flows.
 *
 * Callers still own policy decisions (e.g. receiveThemeUpdates opt-in).
 * This helper only answers the version-comparison question.
 *
 * @param {string|null|undefined} currentVersion
 * @param {string|null|undefined} availableVersion
 * @returns {{
 *   hasUpdate: boolean,
 *   currentVersion: string|null,
 *   latestVersion: string|null,
 *   currentVersionLabel: string,
 *   latestVersionLabel: string,
 * }}
 */
export function getUpdateStatus(currentVersion, availableVersion) {
  const current = currentVersion && isValidVersion(currentVersion) ? currentVersion : null;
  const available = availableVersion && isValidVersion(availableVersion) ? availableVersion : null;

  const hasUpdate = current !== null && available !== null && isNewerVersion(current, available);

  return {
    hasUpdate,
    currentVersion: current,
    latestVersion: available,
    currentVersionLabel: current || "unknown",
    latestVersionLabel: available || "unknown",
  };
}

/**
 * Quick boolean check: is the available version newer than the current?
 * Returns false for any missing or invalid version.
 *
 * @param {string|null|undefined} currentVersion
 * @param {string|null|undefined} availableVersion
 * @returns {boolean}
 */
export function hasAvailableUpdate(currentVersion, availableVersion) {
  if (!currentVersion || !availableVersion) return false;
  if (!isValidVersion(currentVersion) || !isValidVersion(availableVersion)) return false;
  return isNewerVersion(currentVersion, availableVersion);
}
