import express from "express";
import {
  getProjectMedia,
  uploadProjectMedia,
  deleteProjectMedia,
  serveProjectMedia,
  upload,
  bulkDeleteProjectMedia,
  updateMediaMetadata,
} from "../controllers/mediaController.js";

const router = express.Router();

// Get all media for a project
router.get("/projects/:projectId/media", getProjectMedia);

// Upload media to a project
router.post("/projects/:projectId/media", upload.array("files", 10), uploadProjectMedia);

// Update media metadata
router.put("/projects/:projectId/media/:fileId/metadata", updateMediaMetadata);

// Delete a media file
router.delete("/projects/:projectId/media/:fileId", deleteProjectMedia);

// Bulk delete media files
router.post("/projects/:projectId/media/bulk-delete", bulkDeleteProjectMedia);

// Serve a media file by ID
router.get("/projects/:projectId/media/:fileId", serveProjectMedia);

// Serve media files directly from uploads/images
router.get("/projects/:projectId/uploads/images/:filename", (req, res) => {
  const { projectId, filename } = req.params;
  req.params.filename = filename;
  serveProjectMedia(req, res);
});

// Serve media files directly from uploads/videos
router.get("/projects/:projectId/uploads/videos/:filename", (req, res) => {
  const { projectId, filename } = req.params;
  req.params.filename = filename;
  serveProjectMedia(req, res);
});

export default router;
