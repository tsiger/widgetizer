import express from "express";
import {
  generatePreview,
  createPreviewToken,
  renderSingleWidget,
  getGlobalWidgets,
  saveGlobalWidget,
  serveAsset,
} from "../controllers/previewController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);

// POST /api/preview - Generate a full page preview
router.post("/", generatePreview);

// POST /api/preview/token - Create a preview token for src-based rendering
router.post("/token", createPreviewToken);

// POST /api/preview/widget - Render a single widget
router.post("/widget", renderSingleWidget);

// GET /api/preview/global-widgets - Get all global widgets
router.get("/global-widgets", getGlobalWidgets);

// POST /api/preview/global-widgets/:type - Save a global widget
router.post("/global-widgets/:type", saveGlobalWidget);

// GET /api/preview/assets/:projectId/:folder/*filepath - Serve assets (including nested paths)
router.get("/assets/:projectId/:folder/*filepath", serveAsset);

export default router;
