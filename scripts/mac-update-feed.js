/**
 * Adds the macOS minimum to the Mac update feed (dist-electron/latest-mac.yml).
 *
 * electron-updater skips an update whose feed names a `minimumSystemVersion` newer than the running
 * OS, and offers it otherwise. electron-builder doesn't copy the app's macOS minimum (Electron's
 * LSMinimumSystemVersion) into the feed, so without this a Mac below the minimum would download an
 * update it can't open.
 *
 * The updater compares the value with `os.release()`, the Darwin kernel version, not the marketing
 * version: macOS 11 and later are Darwin 20 and later, so macOS N is Darwin N + 9 (macOS 13 → 22.0.0).
 */

/** "13.0" (LSMinimumSystemVersion) → "22.0.0" (what os.release() reports on that macOS). */
export function darwinVersionForMacOS(macosVersion) {
  const major = Number.parseInt(String(macosVersion).split(".")[0], 10);
  if (!Number.isInteger(major) || major < 11) {
    throw new Error(`Unsupported macOS minimum "${macosVersion}": expected 11 or later`);
  }
  return `${major + 9}.0.0`;
}

/** Returns the feed text with `minimumSystemVersion` set, replacing any value already there. */
export function withMinimumSystemVersion(feedText, darwinVersion) {
  const line = `minimumSystemVersion: ${darwinVersion}`;
  const lines = feedText.split("\n").filter((l) => !/^minimumSystemVersion:/.test(l));
  const versionIndex = lines.findIndex((l) => /^version:/.test(l));
  if (versionIndex === -1) throw new Error("The update feed has no top-level version line");
  lines.splice(versionIndex + 1, 0, line);
  return lines.join("\n");
}
