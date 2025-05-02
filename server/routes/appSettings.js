import express from "express";
import * as appSettingsController from "../controllers/appSettingsController.js";

const router = express.Router();

// GET /api/settings - Retrieve current application settings
router.get("/", appSettingsController.getAppSettings);

// PUT /api/settings - Update application settings
router.put("/", appSettingsController.updateAppSettings);

export default router;
