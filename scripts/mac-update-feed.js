/**
 * Adds the macOS minimum to the Mac update feed (dist-electron/latest-mac.yml).
 *
 * electron-updater skips an update whose feed names a `minimumSystemVersion` newer than the running
 * OS, and offers it otherwise. electron-builder doesn't copy the app's macOS minimum (Electron's
 * LSMinimumSystemVersion) into the feed, and its config can't add one (`releaseInfo` only accepts
 * fixed fields), so `scripts/build-electron.mjs` builds the Mac app without publishing and adds it
 * afterwards. Without it a Mac below the minimum would download an update it can't open.
 *
 * The updater compares the value with `os.release()`, the Darwin kernel version, not the marketing
 * version.
 */

// macOS release → the Darwin major os.release() reports. Apple went from macOS 15 to 26 (Tahoe)
// while Darwin went from 24 to 25, so there's no formula; add a row for each new macOS.
const DARWIN_MAJOR = { 11: 20, 12: 21, 13: 22, 14: 23, 15: 24, 26: 25 };

/** "13.0" (LSMinimumSystemVersion) → "22.0.0" (what os.release() reports on that macOS). */
export function darwinVersionForMacOS(macosVersion) {
  const major = Number.parseInt(String(macosVersion).split(".")[0], 10);
  const darwin = DARWIN_MAJOR[major];
  if (darwin === undefined) {
    throw new Error(`No Darwin version known for macOS "${macosVersion}": add it to scripts/mac-update-feed.js`);
  }
  return `${darwin}.0.0`;
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
