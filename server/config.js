import path from "path";

// Base directories
export const DATA_DIR = path.join(process.cwd(), "data");
export const THEMES_DIR = path.join(process.cwd(), "themes");
export const PUBLISH_DIR = path.join(DATA_DIR, "publish");

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
export const getProjectThumbnailsDir = (projectId) => path.join(getProjectUploadsDir(projectId), "thumbnails");
export const getProjectMediaJsonPath = (projectId) => path.join(getProjectUploadsDir(projectId), "media.json");
export const getImagePath = (projectId, filename) => path.join(getProjectImagesDir(projectId), filename);
export const getThumbnailPath = (projectId, filename) => path.join(getProjectThumbnailsDir(projectId), filename);
