import express from "express";
import * as themeController from "../controllers/themeController.js";
import multer from "multer"; // Import multer for file uploads

const router = express.Router();

// Configure multer for temporary storage of the zip file
// Store in memory for simplicity, as we'll extract and delete it quickly
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/themes - Get all themes
router.get("/", themeController.getAllThemes);

// GET /api/themes/:id - Get a specific theme
router.get("/:id", themeController.getTheme);

// GET /api/themes/:id/widgets - Get theme widgets
router.get("/:id/widgets", themeController.getThemeWidgets);

// GET /api/themes/:id/templates - Get theme templates
router.get("/:id/templates", themeController.getThemeTemplates);

// GET /api/themes/project/:projectId - Get project theme settings
router.get("/project/:projectId", themeController.getProjectThemeSettings);

// POST /api/themes/project/:projectId - Save project theme settings
router.post("/project/:projectId", themeController.saveProjectThemeSettings);

// POST /api/themes/upload - Upload a new theme zip file
router.post("/upload", upload.single("themeZip"), themeController.uploadTheme);

export default router;
