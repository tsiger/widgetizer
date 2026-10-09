import express from "express";
import { body } from "express-validator";
import * as menuController from "../controllers/menuController.js";
import { stripHtmlToText } from "../services/sanitizationService.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { segmentParam } from "../middleware/slugValidators.js";
import { validateRequest } from "../middleware/validateRequest.js";

import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// Get all menus
router.get("/", menuController.getAllMenus);

// Get a menu by id
router.get("/:id", [segmentParam("id")], validateRequest, menuController.getMenu);

// Create a new menu
router.post(
  "/",
  [
    body("name").trim().customSanitizer(stripHtmlToText).notEmpty().withMessage("Menu title is required. HTML tags are not allowed.").isLength({ max: 200 }).withMessage(`Menu title must be at most ${200} characters.`),
    body("description").optional().trim().customSanitizer(stripHtmlToText),
  ],
  validateRequest,
  menuController.createMenu,
);

// Update a menu by id
router.put(
  "/:id",
  [
    segmentParam("id"),
    body("name").trim().customSanitizer(stripHtmlToText).notEmpty().withMessage("Menu title is required. HTML tags are not allowed.").isLength({ max: 200 }).withMessage(`Menu title must be at most ${200} characters.`),
    body("description").optional().trim().customSanitizer(stripHtmlToText),
  ],
  validateRequest,
  menuController.updateMenu,
);

// Duplicate a menu by id
router.post(
  "/:id/duplicate",
  [segmentParam("id")],
  validateRequest,
  menuController.duplicateMenu,
);

// Delete a menu by id
router.delete("/:id", [segmentParam("id")], validateRequest, menuController.deleteMenu);

export default router;
