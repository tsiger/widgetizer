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

const normalizeExportPath = (rawPath) => {
  if (!rawPath) return "index.html";

  // Express 5 with path-to-regexp v6 can return wildcard params as an array
  let requestedPath = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath);

  // Normalize any accidental leading slashes
  requestedPath = requestedPath.replace(/^\/+/, "");

  return requestedPath || "index.html";
};

// Route to serve exported files for viewing (root)
// GET /api/export/view/:exportDir
router.get("/view/:exportDir", (req, res) => {
  req.params.filePath = "index.html";
  return serveExportFile(req, res);
});

// Route to serve exported files for viewing (file path)
// GET /api/export/view/:exportDir/*filePath
router.get("/view/:exportDir/*filePath", (req, res) => {
  return serveExportFile(req, res);
});

function serveExportFile(req, res) {
  try {
    const { exportDir } = req.params;
    const requestedPath = normalizeExportPath(req.params.filePath ?? req.params[0]);

    const fullPath = path.join(PUBLISH_DIR, exportDir, requestedPath);

    // Security check: ensure the path is within the publish directory
    const resolvedPath = path.resolve(fullPath);
    const publishPath = path.resolve(PUBLISH_DIR);

    if (!resolvedPath.startsWith(publishPath)) {
      console.error(`Security check failed: ${resolvedPath} not within ${publishPath}`);
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`File not found: ${resolvedPath}`);
      return res.status(404).json({ error: "File not found", path: requestedPath });
    }

    // Check if it's a directory
    const stats = fs.statSync(resolvedPath);
    if (stats.isDirectory()) {
      // If directory, try index.html inside it
      const indexPath = path.join(resolvedPath, "index.html");
      if (fs.existsSync(indexPath)) {
        const resolvedIndexPath = path.resolve(indexPath);
        if (!resolvedIndexPath.startsWith(publishPath)) {
          return res.status(403).json({ error: "Access denied" });
        }
        return res.sendFile(resolvedIndexPath);
      }
      return res.status(404).json({ error: "File not found", path: requestedPath });
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
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Use sendFile instead of manual streaming for better error handling
    res.sendFile(resolvedPath, (err) => {
      if (err) {
        console.error(`Error sending file ${resolvedPath}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to serve file", message: err.message });
        }
      }
    });
  } catch (error) {
    console.error("Error serving export file:", error);
    console.error("Stack:", error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to serve file", message: error.message });
    }
  }
}

export default router;
