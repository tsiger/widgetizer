import express from "express";
import { body } from "express-validator";
import * as appSettingsController from "../controllers/appSettingsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);

// GET /api/settings - Retrieve current application settings
router.get("/", appSettingsController.getAppSettings);

// PUT /api/settings - Update application settings
router.put(
  "/",
  [body().isObject().withMessage("Request body must be an object.")],
  validateRequest,
  appSettingsController.updateAppSettings,
);

export default router;
