import express from "express";
import * as coreWidgetsController from "../controllers/coreWidgetsController.js";

const router = express.Router();

// GET /api/core-widgets - Get all core widgets
router.get("/", coreWidgetsController.getAllCoreWidgets);

export default router;
