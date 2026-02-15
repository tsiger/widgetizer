import path from "path";

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

export const THEMES_DIR = process.env.THEMES_ROOT
  ? path.resolve(process.env.THEMES_ROOT)
  : path.join(APP_ROOT, "themes");

export const PUBLISH_DIR = path.join(DATA_DIR, "publish");
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

// App settings path
export const getAppSettingsPath = () => path.join(DATA_DIR, "appSettings.json");

// Theme paths - base paths (for theme root)
export const getThemeDir = (themeId) => path.join(THEMES_DIR, themeId);
export const getThemeJsonPath = (themeId) => path.join(getThemeDir(themeId), "theme.json");
export const getThemeWidgetsDir = (themeId) => path.join(getThemeDir(themeId), "widgets");
export const getThemeTemplatesDir = (themeId) => path.join(getThemeDir(themeId), "templates");

// Theme versioning paths
export const getThemeUpdatesDir = (themeId) => path.join(getThemeDir(themeId), "updates");
export const getThemeLatestDir = (themeId) => path.join(getThemeDir(themeId), "latest");
export const getThemeVersionDir = (themeId, version) => path.join(getThemeUpdatesDir(themeId), version);

// Theme preset paths
export const getThemePresetsDir = (themeId) => path.join(getThemeDir(themeId), "presets");
export const getThemePresetsJsonPath = (themeId) => path.join(getThemePresetsDir(themeId), "presets.json");
export const getThemePresetDir = (themeId, presetId) => path.join(getThemePresetsDir(themeId), presetId);

// Project paths
export const getProjectsFilePath = () => path.join(DATA_DIR, "projects", "projects.json");
export const getProjectDir = (projectId) => path.join(DATA_DIR, "projects", projectId);

// Project Page paths
export const getProjectPagesDir = (projectId) => path.join(getProjectDir(projectId), "pages");
export const getPagePath = (projectId, pageId) => path.join(getProjectPagesDir(projectId), `${pageId}.json`);

// Project Menu paths
export const getProjectMenusDir = (projectId) => path.join(getProjectDir(projectId), "menus");
export const getMenuPath = (projectId, menuId) => path.join(getProjectMenusDir(projectId), `${menuId}.json`);

// Project theme paths
export const getProjectThemeDir = (projectId) => path.join(getProjectDir(projectId), "theme");
export const getProjectThemeJsonPath = (projectId) => path.join(getProjectDir(projectId), "theme.json");
export const getProjectThemeTemplatesDir = (projectId) => path.join(getProjectThemeDir(projectId), "templates");
export const getProjectThemeWidgetsDir = (projectId) => path.join(getProjectThemeDir(projectId), "widgets");

// Project Media paths
export const getProjectUploadsDir = (projectId) => path.join(getProjectDir(projectId), "uploads");
export const getProjectImagesDir = (projectId) => path.join(getProjectUploadsDir(projectId), "images");
export const getProjectVideosDir = (projectId) => path.join(getProjectUploadsDir(projectId), "videos");
export const getProjectAudiosDir = (projectId) => path.join(getProjectUploadsDir(projectId), "audios");
export const getProjectThumbnailsDir = (projectId) => path.join(getProjectUploadsDir(projectId), "thumbnails");
export const getProjectMediaJsonPath = (projectId) => path.join(getProjectUploadsDir(projectId), "media.json");
export const getImagePath = (projectId, filename) => path.join(getProjectImagesDir(projectId), filename);
export const getVideoPath = (projectId, filename) => path.join(getProjectVideosDir(projectId), filename);
export const getAudioPath = (projectId, filename) => path.join(getProjectAudiosDir(projectId), filename);
export const getThumbnailPath = (projectId, filename) => path.join(getProjectThumbnailsDir(projectId), filename);

// Log configuration on startup (useful for debugging)
if (process.env.NODE_ENV !== "test") {
  console.log("Server config initialized:");
  console.log(`  APP_ROOT: ${APP_ROOT}`);
  console.log(`  UNPACKED_ROOT: ${UNPACKED_ROOT}`);
  console.log(`  DATA_DIR: ${DATA_DIR}`);
  console.log(`  THEMES_DIR: ${THEMES_DIR}`);
  console.log(`  CORE_WIDGETS_DIR: ${CORE_WIDGETS_DIR}`);
}
