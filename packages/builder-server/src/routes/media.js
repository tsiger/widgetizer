import express from "express";
import { param, body } from "express-validator";
import { stripHtmlTags } from "../services/sanitizationService.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getProjectMedia,
  uploadProjectMedia,
  deleteProjectMedia,
  serveProjectMedia,
  upload,
  bulkDeleteProjectMedia,
  updateMediaMetadata,
  getMediaFileUsage,
  refreshMediaUsage,
} from "../controllers/mediaController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// --- Active-project-scoped media management. These are XHR/fetch calls that
// carry the X-Project-Id header, so the active project is resolved via
// req.scope and the project id stays out of the path (hosted serves the same
// routes under /api/projects/:projectId via the project-scoped router). ---

// Get all media for the active project
router.get("/", getProjectMedia);

// Upload media to the active project
router.post("/", upload.array("files", 10), uploadProjectMedia);

// Bulk delete media files
router.post("/bulk-delete", [body("fileIds").isArray({ min: 1 })], validateRequest, bulkDeleteProjectMedia);

// Refresh media usage tracking
router.post("/refresh-usage", refreshMediaUsage);

// Get media file usage
router.get("/:fileId/usage", [param("fileId").notEmpty()], validateRequest, getMediaFileUsage);

// Delete a media file
router.delete("/:fileId", [param("fileId").notEmpty()], validateRequest, deleteProjectMedia);

// --- Project-id-in-path routes. Browser-native loads (<img src>, downloads)
// and the metadata editor cannot carry the X-Project-Id header, so these keep
// the project id in the URL and read req.params.projectId directly. The hosted
// shell serves media via the cloud asset adapter's getUrl instead. ---

// Update media metadata
router.put(
  "/projects/:projectId/media/:fileId/metadata",
  [
    param("projectId").notEmpty(),
    param("fileId").notEmpty(),
    body("alt").optional().trim().customSanitizer(stripHtmlTags),
    body("title").optional().trim().customSanitizer(stripHtmlTags),
    body("description").optional().trim().customSanitizer(stripHtmlTags),
  ],
  validateRequest,
  updateMediaMetadata,
);

// Serve a media file by ID
router.get(
  "/projects/:projectId/media/:fileId",
  [param("projectId").notEmpty(), param("fileId").notEmpty()],
  validateRequest,
  serveProjectMedia,
);

// Serve media files directly from uploads/images
router.get(
  "/projects/:projectId/uploads/images/:filename",
  [param("projectId").notEmpty(), param("filename").notEmpty()],
  validateRequest,
  (req, res) => {
    const { filename } = req.params;
    req.params.filename = filename;
    serveProjectMedia(req, res);
  },
);

// Serve file assets directly from uploads/files
router.get(
  "/projects/:projectId/uploads/files/:filename",
  [param("projectId").notEmpty(), param("filename").notEmpty()],
  validateRequest,
  (req, res) => {
    const { filename } = req.params;
    req.params.filename = filename;
    serveProjectMedia(req, res);
  },
);

export default router;
