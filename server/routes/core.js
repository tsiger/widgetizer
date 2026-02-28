import express from "express";
import path from "path";
import { STATIC_CORE_ASSETS_DIR } from "../config.js";
import { normalizeDashboardUrl } from "../utils/hostedUrls.js";

const router = express.Router();

// Path to core assets directory (unpacked from asar in Electron builds for sendFile support)
const coreAssetsDir = STATIC_CORE_ASSETS_DIR;

/**
 * GET /api/core/info
 * Returns app runtime info (hosted mode flag, dashboard URL, etc.)
 */
router.get("/info", (req, res) => {
  const hostedMode = !!req.app.locals.hostedMode;
  const dashboardUrl = normalizeDashboardUrl(process.env.DASHBOARD_URL || "/");
  res.json({
    hostedMode,
    dashboardUrl: hostedMode ? dashboardUrl : null,
  });
});

/**
 * GET /api/core/assets/:filename
 * Serves static assets from the core assets directory
 */
router.get("/assets/:filename", (req, res) => {
  const { filename } = req.params;

  // Validate filename to prevent directory traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(coreAssetsDir, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Core asset not found: ${filename}`, err.message);
      res.status(404).json({ error: "Asset not found" });
    }
  });
});

export default router;
