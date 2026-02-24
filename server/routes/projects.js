import express from "express";
import { body, param } from "express-validator";
import * as projectController from "../controllers/projectController.js";
import { stripHtmlTags } from "../services/sanitizationService.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { EDITOR_LIMITS } from "../limits.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);

// GET /api/projects - Get all projects
router.get("/", projectController.getAllProjects);

// GET /api/projects/active - Get the active project
router.get("/active", projectController.getActiveProject);

// POST /api/projects - Create a new project
router.post(
  "/",
  [
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Project name is required.").isLength({ max: EDITOR_LIMITS.maxProjectNameLength }).withMessage(`Project name must be at most ${EDITOR_LIMITS.maxProjectNameLength} characters.`),
    body("description").trim().customSanitizer(stripHtmlTags).isLength({ max: EDITOR_LIMITS.maxProjectDescriptionLength }).withMessage(`Description must be at most ${EDITOR_LIMITS.maxProjectDescriptionLength} characters.`),
    body("siteUrl").optional().trim().customSanitizer(stripHtmlTags),
    body("theme").notEmpty().withMessage("A theme is required to create a project."),
    body("preset").optional().isString().trim(),
  ],
  validateRequest,
  projectController.createProject,
);

// PUT /api/projects/active/:id - Set the active project
router.put(
  "/active/:id",
  [param("id").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.setActiveProject,
);

// PUT /api/projects/:id - Update a project
router.put(
  "/:id",
  [
    param("id").notEmpty().withMessage("Project ID is required."),
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Project name is required.").isLength({ max: EDITOR_LIMITS.maxProjectNameLength }).withMessage(`Project name must be at most ${EDITOR_LIMITS.maxProjectNameLength} characters.`),
    body("description").trim().customSanitizer(stripHtmlTags).isLength({ max: EDITOR_LIMITS.maxProjectDescriptionLength }).withMessage(`Description must be at most ${EDITOR_LIMITS.maxProjectDescriptionLength} characters.`),
    body("siteUrl").optional().trim().customSanitizer(stripHtmlTags),
  ],
  validateRequest,
  projectController.updateProject,
);

// DELETE /api/projects/:id - Delete a project
router.delete("/:id", [param("id").notEmpty().withMessage("Project ID is required.")], validateRequest, projectController.deleteProject);

// POST /api/projects/:id/duplicate - Duplicate a project
router.post(
  "/:id/duplicate",
  [param("id").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.duplicateProject,
);

// GET /api/projects/:projectId/widgets - Get project widgets
router.get(
  "/:projectId/widgets",
  [param("projectId").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.getProjectWidgets,
);

// GET /api/projects/:projectId/icons - Get project icons
router.get(
  "/:projectId/icons",
  [param("projectId").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.getProjectIcons,
);

// POST /api/projects/:projectId/export - Export project as ZIP
router.post(
  "/:projectId/export",
  [param("projectId").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.exportProject,
);

// POST /api/projects/import - Import project from ZIP
router.post("/import", projectController.handleImportUpload, projectController.importProject);

// ============================================================================
// Theme Update Routes
// ============================================================================

// GET /api/projects/:id/theme-updates/status - Check for theme updates
router.get(
  "/:id/theme-updates/status",
  [param("id").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.getThemeUpdateStatus,
);

// PUT /api/projects/:id/theme-updates - Toggle theme updates preference
router.put(
  "/:id/theme-updates",
  [param("id").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.toggleProjectThemeUpdates,
);

// POST /api/projects/:id/theme-updates/apply - Apply theme update
router.post(
  "/:id/theme-updates/apply",
  [param("id").notEmpty().withMessage("Project ID is required.")],
  validateRequest,
  projectController.applyProjectThemeUpdate,
);

export default router;
