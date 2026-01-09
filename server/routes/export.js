import express from "express";
import path from "path";
import fs from "fs";
import { PUBLISH_DIR } from "../config.js";
import {
  exportProject,
  getExportHistory,
  deleteExport,
  getExportFiles,
  downloadExport,
} from "../controllers/exportController.js";

const router = express.Router();

// Route to trigger the exporting process for a project
// POST /api/export/:projectId
router.post("/:projectId", exportProject);

// Route to get export history for a project
// GET /api/export/history/:projectId
router.get("/history/:projectId", getExportHistory);

// Route to delete a specific export
// DELETE /api/export/:projectId/:version
router.delete("/:projectId/:version", deleteExport);

// Route to get export files info
// GET /api/export/files/:exportDir
router.get("/files/:exportDir", getExportFiles);

// Route to download export as ZIP
// GET /api/export/download/:exportDir
router.get("/download/:exportDir", downloadExport);

// Route to serve exported files for viewing
// GET /api/export/view/:exportDir/*filePath
router.get("/view/:exportDir/*filePath", (req, res) => {
  try {
    const { exportDir, filePath } = req.params;
    const requestedPath = filePath || "index.html"; // Default to index.html

    const fullPath = path.join(PUBLISH_DIR, exportDir, requestedPath);

    // Security check: ensure the path is within the publish directory
    const resolvedPath = path.resolve(fullPath);
    const publishPath = path.resolve(PUBLISH_DIR);

    if (!resolvedPath.startsWith(publishPath)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Determine content type
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Stream the file
    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error serving export file:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
