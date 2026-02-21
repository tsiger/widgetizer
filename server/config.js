import path from "path";
import { getMediaCategory } from "./utils/mimeTypes.js";

// Base directories with environment variable support.
// APP_ROOT is set by Electron to the app.asar path, or defaults to cwd for non-Electron use.
export const APP_ROOT = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : process.cwd();

// UNPACKED_ROOT points to app.asar.unpacked in packaged Electron builds.
// Files that must be served via express.static() or res.sendFile() need to be on real disk
// (not inside an asar archive), so they are unpacked and accessed via this path.
// In non-Electron environments, this defaults to APP_ROOT (same directory).
export const UNPACKED_ROOT = process.env.UNPACKED_ROOT
  ? path.resolve(process.env.UNPACKED_ROOT)
  : APP_ROOT;

export const DATA_DIR = process.env.DATA_ROOT ? path.resolve(process.env.DATA_ROOT) : path.join(APP_ROOT, "data");

// Legacy global themes dir — used as the seed directory for provisioning default themes
// to new users. Production code should use getUserThemesDir(userId) instead.
export const THEMES_SEED_DIR = process.env.THEMES_ROOT
  ? path.resolve(process.env.THEMES_ROOT)
  : path.join(APP_ROOT, "themes");

// Keep THEMES_DIR as an alias for backward compat in tests that set THEMES_ROOT
export const THEMES_DIR = THEMES_SEED_DIR;

// Legacy global publish dir — kept for backward compat in tests.
// Production code should use getUserPublishDir(userId) instead.
export const PUBLISH_DIR = path.join(DATA_DIR, "publish");

// User-scoped publish directory for exports
export const getUserPublishDir = (userId = "local") => path.join(getUserDataDir(userId), "publish");

export const CORE_WIDGETS_DIR = path.join(APP_ROOT, "src", "core", "widgets");

// Static paths — served via express.static() or res.sendFile(), so must be real files on disk.
// In packaged Electron builds these are unpacked from the asar archive.
export const STATIC_DIST_DIR = path.join(UNPACKED_ROOT, "dist");
export const STATIC_CORE_ASSETS_DIR = path.join(UNPACKED_ROOT, "src", "core", "assets");
export const STATIC_UTILS_DIR = path.join(UNPACKED_ROOT, "src", "utils");

// Helper to check if a path is inside an asar archive
export function isAsarPath(p) {
  return p.includes(".asar" + path.sep) || p.includes(".asar/");
}

// Database path
export const getDbPath = () => path.join(DATA_DIR, "widgetizer.db");

// User data paths
export const getUserDataDir = (userId) => path.join(DATA_DIR, "users", userId);

// User-scoped themes directory
export const getUserThemesDir = (userId = "local") => path.join(getUserDataDir(userId), "themes");

// Theme paths — user-scoped (each user has their own installed themes)
export const getThemeDir = (themeId, userId = "local") => path.join(getUserThemesDir(userId), themeId);
export const getThemeJsonPath = (themeId, userId = "local") => path.join(getThemeDir(themeId, userId), "theme.json");
export const getThemeWidgetsDir = (themeId, userId = "local") => path.join(getThemeDir(themeId, userId), "widgets");
export const getThemeTemplatesDir = (themeId, userId = "local") => path.join(getThemeDir(themeId, userId), "templates");

// Theme versioning paths
export const getThemeUpdatesDir = (themeId, userId = "local") => path.join(getThemeDir(themeId, userId), "updates");
export const getThemeLatestDir = (themeId, userId = "local") => path.join(getThemeDir(themeId, userId), "latest");
export const getThemeVersionDir = (themeId, version, userId = "local") => path.join(getThemeUpdatesDir(themeId, userId), version);

// Theme preset paths (user-scoped)
export const getThemePresetsDir = (themeId, userId = "local") => path.join(getThemeDir(themeId, userId), "presets");
export const getThemePresetsJsonPath = (themeId, userId = "local") => path.join(getThemePresetsDir(themeId, userId), "presets.json");
export const getThemePresetDir = (themeId, presetId, userId = "local") => path.join(getThemePresetsDir(themeId, userId), presetId);

// Project paths
export const getProjectDir = (projectId, userId) => path.join(getUserDataDir(userId), "projects", projectId);

// Project Page paths
export const getProjectPagesDir = (projectId, userId) => path.join(getProjectDir(projectId, userId), "pages");
export const getPagePath = (projectId, pageId, userId) =>
  path.join(getProjectPagesDir(projectId, userId), `${pageId}.json`);

// Project Menu paths
export const getProjectMenusDir = (projectId, userId) => path.join(getProjectDir(projectId, userId), "menus");
export const getMenuPath = (projectId, menuId, userId) =>
  path.join(getProjectMenusDir(projectId, userId), `${menuId}.json`);

// Project theme paths
export const getProjectThemeDir = (projectId, userId) => path.join(getProjectDir(projectId, userId), "theme");
export const getProjectThemeJsonPath = (projectId, userId) =>
  path.join(getProjectDir(projectId, userId), "theme.json");
export const getProjectThemeTemplatesDir = (projectId, userId) =>
  path.join(getProjectThemeDir(projectId, userId), "templates");
export const getProjectThemeWidgetsDir = (projectId, userId) =>
  path.join(getProjectThemeDir(projectId, userId), "widgets");

// Project Media paths
export const getProjectUploadsDir = (projectId, userId) => path.join(getProjectDir(projectId, userId), "uploads");
export const getProjectImagesDir = (projectId, userId) => path.join(getProjectUploadsDir(projectId, userId), "images");
export const getProjectVideosDir = (projectId, userId) => path.join(getProjectUploadsDir(projectId, userId), "videos");
export const getProjectAudiosDir = (projectId, userId) => path.join(getProjectUploadsDir(projectId, userId), "audios");
export const getImagePath = (projectId, filename, userId) =>
  path.join(getProjectImagesDir(projectId, userId), filename);
export const getVideoPath = (projectId, filename, userId) =>
  path.join(getProjectVideosDir(projectId, userId), filename);
export const getAudioPath = (projectId, filename, userId) =>
  path.join(getProjectAudiosDir(projectId, userId), filename);

// Re-export from centralized MIME utils so existing importers keep working
export { getMediaCategory };

/**
 * Resolve the upload directory for a given project and MIME type.
 */
export function getMediaDir(projectFolderName, mimeType, userId) {
  const category = getMediaCategory(mimeType);
  if (category === "video") return getProjectVideosDir(projectFolderName, userId);
  if (category === "audio") return getProjectAudiosDir(projectFolderName, userId);
  return getProjectImagesDir(projectFolderName, userId);
}

// Log configuration on startup (useful for debugging)
if (process.env.NODE_ENV !== "test") {
  console.log("Server config initialized:");
  console.log(`  APP_ROOT: ${APP_ROOT}`);
  console.log(`  UNPACKED_ROOT: ${UNPACKED_ROOT}`);
  console.log(`  DATA_DIR: ${DATA_DIR}`);
  console.log(`  THEMES_DIR: ${THEMES_DIR}`);
  console.log(`  CORE_WIDGETS_DIR: ${CORE_WIDGETS_DIR}`);
}
