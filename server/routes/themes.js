import express from "express";
import * as themeController from "../controllers/themeController.js";

const router = express.Router();

// GET /api/themes - Get all themes
router.get("/", themeController.getAllThemes);

// GET /api/themes/update-count - Get count of themes with updates available
router.get("/update-count", themeController.getThemeUpdateCount);

// GET /api/themes/:id - Get a specific theme
router.get("/:id", themeController.getTheme);

// GET /api/themes/:id/widgets - Get theme widgets
router.get("/:id/widgets", themeController.getThemeWidgets);

// GET /api/themes/:id/templates - Get theme templates
router.get("/:id/templates", themeController.getThemeTemplates);

// GET /api/themes/:id/versions - Get theme versions
router.get("/:id/versions", themeController.getThemeVersionsHandler);

// GET /api/themes/:id/presets - Get theme presets
router.get("/:id/presets", themeController.getThemePresets);

// POST /api/themes/:id/update - Update a single theme (build latest/)
router.post("/:id/update", themeController.updateTheme);

// GET /api/themes/project/:projectId - Get project theme settings
router.get("/project/:projectId", themeController.getProjectThemeSettings);

// POST /api/themes/project/:projectId - Save project theme settings
router.post("/project/:projectId", themeController.saveProjectThemeSettings);

// POST /api/themes/upload - Upload a new theme zip file
router.post("/upload", themeController.handleThemeUpload, themeController.uploadTheme);

// DELETE /api/themes/:id - Delete a theme if not in use
router.delete("/:id", themeController.deleteTheme);

export default router;
