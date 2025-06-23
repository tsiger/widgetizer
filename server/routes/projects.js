import express from "express";
import { body, param } from "express-validator";
import * as projectController from "../controllers/projectController.js";

const router = express.Router();

// GET /api/projects - Get all projects
router.get("/", projectController.getAllProjects);

// GET /api/projects/active - Get the active project
router.get("/active", projectController.getActiveProject);

// POST /api/projects - Create a new project
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Project name is required.").trim().escape(),
    body("description").trim().escape(),
    body("theme").notEmpty().withMessage("A theme is required to create a project."),
  ],
  projectController.createProject,
);

// PUT /api/projects/active/:id - Set the active project
router.put(
  "/active/:id",
  [param("id").notEmpty().withMessage("Project ID is required.")],
  projectController.setActiveProject,
);

// PUT /api/projects/:id - Update a project
router.put(
  "/:id",
  [
    param("id").notEmpty().withMessage("Project ID is required."),
    body("name").notEmpty().withMessage("Project name is required.").trim().escape(),
    body("description").trim().escape(),
  ],
  projectController.updateProject,
);

// DELETE /api/projects/:id - Delete a project
router.delete("/:id", [param("id").notEmpty().withMessage("Project ID is required.")], projectController.deleteProject);

// POST /api/projects/:id/duplicate - Duplicate a project
router.post(
  "/:id/duplicate",
  [param("id").notEmpty().withMessage("Project ID is required.")],
  projectController.duplicateProject,
);

// GET /api/projects/:projectId/widgets - Get project widgets
router.get(
  "/:projectId/widgets",
  [param("projectId").notEmpty().withMessage("Project ID is required.")],
  projectController.getProjectWidgets,
);

export default router;
