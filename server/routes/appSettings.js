import express from "express";
import { body } from "express-validator";
import * as appSettingsController from "../controllers/appSettingsController.js";

const router = express.Router();

// GET /api/settings - Retrieve current application settings
router.get("/", appSettingsController.getAppSettings);

// PUT /api/settings - Update application settings
router.put(
  "/",
  [body("settings").isObject().withMessage("Settings must be an object.")],
  appSettingsController.updateAppSettings,
);

export default router;
