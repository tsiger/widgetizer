import path from "path";

// Base directories with environment variable support.
// APP_ROOT is set by Electron to the app.asar path, or defaults to cwd for non-Electron use.
const APP_ROOT = process.env.APP_ROOT
  ? path.resolve(process.env.APP_ROOT)
  : process.cwd();

export const DATA_DIR = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.join(APP_ROOT, "data");

export const THEMES_DIR = process.env.THEMES_ROOT
  ? path.resolve(process.env.THEMES_ROOT)
  : path.join(APP_ROOT, "themes");

export const PUBLISH_DIR = path.join(DATA_DIR, "publish");
export const CORE_WIDGETS_DIR = path.join(APP_ROOT, "src", "core", "widgets");

// App settings path
export const getAppSettingsPath = () => path.join(DATA_DIR, "appSettings.json");

// Theme paths
export const getThemeDir = (themeId) => path.join(THEMES_DIR, themeId);
export const getThemeJsonPath = (themeId) => path.join(getThemeDir(themeId), "theme.json");
export const getThemeWidgetsDir = (themeId) => path.join(getThemeDir(themeId), "widgets");
export const getThemeTemplatesDir = (themeId) => path.join(getThemeDir(themeId), "templates");

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
  console.log(`  DATA_DIR: ${DATA_DIR}`);
  console.log(`  THEMES_DIR: ${THEMES_DIR}`);
  console.log(`  CORE_WIDGETS_DIR: ${CORE_WIDGETS_DIR}`);
}
