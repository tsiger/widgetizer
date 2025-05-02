import express from "express";
import * as projectController from "../controllers/projectController.js";

const router = express.Router();

// GET /api/projects - Get all projects
router.get("/", projectController.getAllProjects);

// GET /api/projects/active - Get the active project
router.get("/active", projectController.getActiveProject);

// POST /api/projects - Create a new project
router.post("/", projectController.createProject);

// PUT /api/projects/active/:id - Set the active project
router.put("/active/:id", projectController.setActiveProject);

// PUT /api/projects/:id - Update a project
router.put("/:id", projectController.updateProject);

// DELETE /api/projects/:id - Delete a project
router.delete("/:id", projectController.deleteProject);

// GET /api/projects/:projectId/widgets - Get project widgets
router.get("/:projectId/widgets", projectController.getProjectWidgets);

export default router;
