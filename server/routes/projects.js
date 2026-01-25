import express from "express";
import { body, param } from "express-validator";
import multer from "multer";
import * as projectController from "../controllers/projectController.js";
import { readAppSettingsFile } from "../controllers/appSettingsController.js";

const router = express.Router();

// Dynamic multer configuration based on app settings
async function getMulterConfig() {
  try {
    const settings = await readAppSettingsFile();
    const maxSizeMB = settings.export?.maxImportSizeMB || 500;
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: maxSizeMB * 1024 * 1024, // Convert MB to bytes
      },
      fileFilter: (req, file, cb) => {
        // Only accept ZIP files
        if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed" || file.originalname.endsWith(".zip")) {
          cb(null, true);
        } else {
          cb(new Error("Only ZIP files are allowed"), false);
        }
      },
    });
  } catch (error) {
    console.error("Error reading app settings for multer config:", error);
    // Fallback to default 500MB
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed" || file.originalname.endsWith(".zip")) {
          cb(null, true);
        } else {
          cb(new Error("Only ZIP files are allowed"), false);
        }
      },
    });
  }
}

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

// GET /api/projects/:projectId/icons - Get project icons
router.get(
  "/:projectId/icons",
  [param("projectId").notEmpty().withMessage("Project ID is required.")],
  projectController.getProjectIcons,
);

// POST /api/projects/:projectId/export - Export project as ZIP
router.post(
  "/:projectId/export",
  [param("projectId").notEmpty().withMessage("Project ID is required.")],
  projectController.exportProject,
);

// POST /api/projects/import - Import project from ZIP
router.post("/import", async (req, res, next) => {
  try {
    const upload = await getMulterConfig();
    // Multer middleware with error handling
    upload.single("projectZip")(req, res, async (err) => {
      if (err) {
        // Handle multer errors (file size, file type, etc.)
        if (err.code === "LIMIT_FILE_SIZE") {
          try {
            const settings = await readAppSettingsFile();
            const maxSizeMB = settings.export?.maxImportSizeMB || 500;
            return res.status(400).json({
              error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB. Please reduce the project size or increase the limit in Settings.`,
            });
          } catch {
            return res.status(400).json({
              error: "File size exceeds the maximum allowed size. Please reduce the project size or increase the limit in Settings.",
            });
          }
        } else {
          return res.status(400).json({ error: err.message || "File upload error" });
        }
      } else {
        next();
      }
    });
  } catch {
    return res.status(500).json({ error: "Failed to configure file upload" });
  }
}, projectController.importProject);

export default router;
