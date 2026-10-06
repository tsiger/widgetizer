import express from "express";
import * as themeController from "../controllers/themeController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { segmentParam } from "../middleware/slugValidators.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();
router.use(standardJsonParser);

// A theme id names its folder under the themes directory (`getThemeDir`), and
// deleting a theme removes that folder recursively.
const themeId = [segmentParam("id"), validateRequest];

// GET /api/themes - Get all themes
router.get("/", themeController.getAllThemes);

// GET /api/themes/update-count - Get count of themes with updates available
router.get("/update-count", themeController.getThemeUpdateCount);

// GET /api/themes/:id - Get a specific theme
router.get("/:id", themeId, themeController.getTheme);

// GET /api/themes/:id/widgets - Get theme widgets
router.get("/:id/widgets", themeId, themeController.getThemeWidgets);

// GET /api/themes/:id/templates - Get theme templates
router.get("/:id/templates", themeId, themeController.getThemeTemplates);

// GET /api/themes/:id/versions - Get theme versions
router.get("/:id/versions", themeId, themeController.getThemeVersionsHandler);

// GET /api/themes/:id/presets - Get theme presets
router.get("/:id/presets", themeId, themeController.getThemePresets);

// POST /api/themes/:id/update - Update a single theme (build latest/)
router.post("/:id/update", themeId, themeController.updateTheme);

// GET /api/themes/project/:projectId - Get project theme settings
router.get("/project/:projectId", resolveActiveProject, themeController.getProjectThemeSettings);

// POST /api/themes/project/:projectId - Save project theme settings
router.post("/project/:projectId", resolveActiveProject, themeController.saveProjectThemeSettings);

// GET /api/themes/project/:projectId/locales/:lang - Get theme locale for a project
router.get("/project/:projectId/locales/:lang", resolveActiveProject, themeController.getProjectThemeLocale);

// POST /api/themes/upload - Upload a new theme zip file
router.post("/upload", themeController.handleThemeUpload, themeController.uploadTheme);

// DELETE /api/themes/:id - Delete a theme if not in use
router.delete("/:id", themeId, themeController.deleteTheme);

export default router;
