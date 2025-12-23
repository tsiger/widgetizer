import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to core assets directory
const coreAssetsDir = path.join(__dirname, "../../src/core/assets");

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
