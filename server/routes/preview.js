import express from "express";
import {
  generatePreview,
  renderSingleWidget,
  renderWidgetFragment,
  getGlobalWidgets,
  saveGlobalWidget,
  serveAsset,
} from "../controllers/previewController.js";

const router = express.Router();

// POST /api/preview - Generate a full page preview
router.post("/", generatePreview);

// POST /api/preview/widget - Render a single widget
router.post("/widget", renderSingleWidget);

// POST /api/preview/widget-fragment - Render a widget fragment
router.post("/widget-fragment", renderWidgetFragment);

// GET /api/preview/global-widgets - Get all global widgets
router.get("/global-widgets", getGlobalWidgets);

// POST /api/preview/global-widgets/:type - Save a global widget
router.post("/global-widgets/:type", saveGlobalWidget);

// GET /api/preview/assets/:projectId/:folder/:filename - Serve an asset
router.get("/assets/:projectId/:folder/:filename", serveAsset);

export default router;
