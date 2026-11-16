import express from "express";
import path from "node:path";
import fs from "node:fs";
import { getPublishDir } from "../config.js";
import { getContentType } from "../utils/mimeTypes.js";
import { isWithinDirectory } from "../utils/pathSecurity.js";
import { resolveExportFile } from "../utils/exportFiles.js";
import { sendFileDone } from "../utils/sendFileOutcome.js";
import {
  exportProject,
  getExportHistory,
  deleteExport,
  getExportFiles,
  downloadExport,
} from "../controllers/exportController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { START_PATH, sendNavigationPage } from "../services/exportSite.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { siteUrlPathname } from "@widgetizer/core/internalHref";
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
  return viewExport(req, res);
});

// Route to serve exported files for viewing (file path)
// GET /api/export/view/:exportDir/*filePath
router.get("/view/:exportDir/*filePath", (req, res) => {
  return viewExport(req, res);
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

// The folder the export's site is served from: the manifest's sitePath, else the
// project's current Site URL path (exports made before the manifest carried it).
// Always starts and ends with "/".
function exportSitePath(exportRoot, projectId) {
  let sitePath;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(exportRoot, "manifest.json"), "utf8"));
    if (typeof manifest?.sitePath === "string") sitePath = manifest.sitePath;
  } catch {
    // No readable manifest: use the project's Site URL.
  }
  if (sitePath === undefined) sitePath = siteUrlPathname(projectRepo.getProjectById(projectId)?.siteUrl || "");
  return sitePath.endsWith("/") ? sitePath : `${sitePath}/`;
}

// With a ready export viewer the export is shown there, with "/" as its root;
// otherwise (no viewer, not ready, no address) the file is served from this app.
function viewExport(req, res) {
  try {
    const { exportDir } = req.params;
    const viewer = req.adapters?.exportViewer;
    if (!exportDirBelongsToScope(req, exportDir) || !viewer?.isReady()) return serveExportFile(req, res);
    const base = viewer.baseUrlFor(req);
    if (!base) return serveExportFile(req, res);

    const exportRoot = path.resolve(getPublishDir(), exportDir);
    const sitePath = exportSitePath(exportRoot, req.scope.projectId);
    viewer.show({ exportDir, exportRoot, sitePath });

    const filePath = normalizeExportPath(req.params.filePath ?? req.params[0]);
    const search = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    // `to` is read as URL syntax by the viewer, so the (decoded) file path is
    // re-encoded per segment; the site path already is encoded, the query raw.
    const encodedFilePath = filePath.split("/").map(encodeURIComponent).join("/");
    // A `//host`-shaped site path would make `to` read as another origin, which
    // the viewer refuses (losing the file); `/.` keeps it a path, as startDestination does.
    const target = `${sitePath}${encodedFilePath}${search}`;
    const to = target.startsWith("//") ? `/.${target}` : target;
    // A page that navigates, not a 302: Safari ignores the start page's
    // Clear-Site-Data when it is reached through a redirect from another origin.
    return sendNavigationPage(res, `${base}${START_PATH}?to=${encodeURIComponent(to)}`);
  } catch (error) {
    console.error("Error opening export in the viewer:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to serve file", message: error.message });
    }
  }
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

    // Sent relative to the export, so only the part inside it is checked for
    // dot-folders: `send` refuses any path with one ("Not Found"), and the
    // desktop app's data lives under `~/.config` on Linux.
    const exportRoot = path.resolve(getPublishDir(), exportDir);
    // Already true once resolveExportFile found the file there; kept so this
    // root can never sit outside the publish folder, nor the file outside it.
    if (!isWithinDirectory(exportRoot, path.resolve(getPublishDir())) || !isWithinDirectory(fileToSend, exportRoot)) {
      return res.status(404).json({ error: "File not found", path: requestedPath });
    }
    res.sendFile(
      path.relative(exportRoot, fileToSend),
      { root: exportRoot },
      sendFileDone(res, (err) => {
        console.error(`Error sending file ${fileToSend}:`, err);
        res.status(500).json({ error: "Failed to serve file", message: err.message });
      }),
    );
  } catch (error) {
    console.error("Error serving export file:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to serve file", message: error.message });
    }
  }
}

export default router;
