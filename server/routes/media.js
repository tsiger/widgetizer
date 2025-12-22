import express from "express";
import { param, body } from "express-validator";
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

const router = express.Router();

// Get all media for a project
router.get("/projects/:projectId/media", [param("projectId").notEmpty()], getProjectMedia);

// Upload media to a project
router.post(
  "/projects/:projectId/media",
  [param("projectId").notEmpty()],
  upload.array("files", 10),
  uploadProjectMedia,
);

// Update media metadata
router.put(
  "/projects/:projectId/media/:fileId/metadata",
  [param("projectId").notEmpty(), param("fileId").notEmpty()],
  updateMediaMetadata,
);

// Delete a media file
router.delete(
  "/projects/:projectId/media/:fileId",
  [param("projectId").notEmpty(), param("fileId").notEmpty()],
  deleteProjectMedia,
);

// Bulk delete media files
router.post(
  "/projects/:projectId/media/bulk-delete",
  [param("projectId").notEmpty(), body("fileIds").isArray({ min: 1 })],
  bulkDeleteProjectMedia,
);

// Get media file usage
router.get(
  "/projects/:projectId/media/:fileId/usage",
  [param("projectId").notEmpty(), param("fileId").notEmpty()],
  getMediaFileUsage,
);

// Refresh media usage tracking
router.post("/projects/:projectId/refresh-usage", [param("projectId").notEmpty()], refreshMediaUsage);

// Serve a media file by ID
router.get(
  "/projects/:projectId/media/:fileId",
  [param("projectId").notEmpty(), param("fileId").notEmpty()],
  serveProjectMedia,
);

// Serve media files directly from uploads/images
router.get(
  "/projects/:projectId/uploads/images/:filename",
  [param("projectId").notEmpty(), param("filename").notEmpty()],
  (req, res) => {
    const { projectId, filename } = req.params;
    req.params.filename = filename;
    serveProjectMedia(req, res);
  },
);

// Serve media files directly from uploads/videos
router.get(
  "/projects/:projectId/uploads/videos/:filename",
  [param("projectId").notEmpty(), param("filename").notEmpty()],
  (req, res) => {
    const { projectId, filename } = req.params;
    req.params.filename = filename;
    serveProjectMedia(req, res);
  },
);

// Serve media files directly from uploads/audios
router.get(
  "/projects/:projectId/uploads/audios/:filename",
  [param("projectId").notEmpty(), param("filename").notEmpty()],
  (req, res) => {
    const { projectId, filename } = req.params;
    req.params.filename = filename;
    serveProjectMedia(req, res);
  },
);

export default router;
