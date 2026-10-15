import express from "express";
import path from "path";
import fs from "fs";
import { getPublishDir } from "../config.js";
import { getContentType } from "../utils/mimeTypes.js";
import { isWithinDirectory } from "../utils/pathSecurity.js";
import {
  exportProject,
  getExportHistory,
  deleteExport,
  getExportFiles,
  downloadExport,
} from "../controllers/exportController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// Active-project-scoped export actions: XHR/fetch calls carry the X-Project-Id
// header, so the active project is resolved via req.scope and stays out of the
// path. The serve/download routes below are browser-native and stay keyed by
// exportDir.

// Route to trigger the exporting process for the active project
// POST /api/export
router.post("/", exportProject);

// Route to get export history for the active project
// GET /api/export/history
router.get("/history", getExportHistory);

// Route to delete a specific export
// DELETE /api/export/:version
router.delete("/:version", deleteExport);

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

// An export dir belongs to the actor only when it is the active project's own
// bundle. OSS names export dirs `<folderName>` / `<folderName>-v<n>`
// (exportController), so binding to req.scope.folderName is byte-neutral for OSS
// standalone (the active project's own request always matches) while blocking a
// cross-tenant read of the GLOBAL publish dir in any multi-tenant mount.
function exportDirBelongsToScope(req, exportDir) {
  const folderName = req.scope?.folderName;
  if (!folderName || typeof exportDir !== "string") return false;
  // Reject any path separator or parent-segment token first: exportDir must be a
  // single directory name. Without this, "<folder>-v1/../<otherTenant>-v1" would
  // pass the prefix check and path.join would normalize it back INTO the publish
  // dir (inside isWithinDirectory's bound), reaching a sibling tenant's export.
  if (exportDir.includes("/") || exportDir.includes("\\") || exportDir.includes("..")) return false;
  if (exportDir === folderName) return true;
  // Anchored suffix: exactly `<folderName>-v<digits>` (the exportProject naming).
  const prefix = `${folderName}-v`;
  return exportDir.startsWith(prefix) && /^\d+$/.test(exportDir.slice(prefix.length));
}

/**
 * Resolve a viewer request to the file to send, or null. Beyond the exact
 * path, an extensionless request also tries `<path>.html` then
 * `<path>/index.html` — projects with Clean URLs on emit links like `about`
 * that a real host resolves to `about.html`; a directory-style request
 * (`about/`) tries the flat file then its index. Every candidate is confined
 * to the selected export directory (never merely the publish root), so a
 * fallback can never reach a sibling export.
 *
 * @param {string} publishDir - the global publish directory
 * @param {string} exportDir - the export's directory name (already scope-checked)
 * @param {string} requestedPath - normalized request path, no leading slash
 * @returns {string|null} absolute path of a regular file, or null
 */
export function resolveExportFile(publishDir, exportDir, requestedPath) {
  const exportRoot = path.resolve(publishDir, exportDir);
  if (!isWithinDirectory(exportRoot, path.resolve(publishDir))) return null;

  const trailingSlash = requestedPath.endsWith("/");
  const trimmed = requestedPath.replace(/\/+$/, "");
  const base = path.resolve(exportRoot, trimmed);
  const lastSegment = trimmed.split("/").pop() || "";

  let candidates;
  if (trailingSlash) {
    candidates = [`${base}.html`, path.join(base, "index.html")];
  } else if (lastSegment.includes(".")) {
    candidates = [base];
  } else {
    candidates = [base, `${base}.html`, path.join(base, "index.html")];
  }

  for (const candidate of candidates) {
    const abs = path.resolve(candidate);
    if (!isWithinDirectory(abs, exportRoot)) continue;
    if (!fs.existsSync(abs)) continue;
    if (!fs.statSync(abs).isFile()) continue;
    return abs;
  }
  return null;
}

function serveExportFile(req, res) {
  try {
    const { exportDir } = req.params;
    if (!exportDirBelongsToScope(req, exportDir)) {
      return res.status(404).json({ error: "File not found" });
    }
    const requestedPath = normalizeExportPath(req.params.filePath ?? req.params[0]);

    const fileToSend = resolveExportFile(getPublishDir(), exportDir, requestedPath);
    if (!fileToSend) {
      console.error(`File not found: ${path.join(exportDir, requestedPath)}`);
      return res.status(404).json({ error: "File not found", path: requestedPath });
    }

    const ext = path.extname(fileToSend).toLowerCase();
    res.setHeader("Content-Type", getContentType(ext));

    // Use sendFile instead of manual streaming for better error handling
    res.sendFile(fileToSend, (err) => {
      if (err) {
        console.error(`Error sending file ${fileToSend}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to serve file", message: err.message });
        }
      }
    });
  } catch (error) {
    console.error("Error serving export file:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to serve file", message: error.message });
    }
  }
}

export default router;
