import express from "express";
import { body, param } from "express-validator";
import * as menuController from "../controllers/menuController.js";
import { stripHtmlTags } from "../services/sanitizationService.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { EDITOR_LIMITS } from "../limits.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// Get all menus
router.get("/", menuController.getAllMenus);

// Get a menu by id
router.get("/:id", [param("id").notEmpty().withMessage("Menu ID is required.")], validateRequest, menuController.getMenu);

// Create a new menu
router.post(
  "/",
  [
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Menu name is required.").isLength({ max: EDITOR_LIMITS.maxMenuNameLength }).withMessage(`Menu name must be at most ${EDITOR_LIMITS.maxMenuNameLength} characters.`),
    body("description").optional().trim().customSanitizer(stripHtmlTags),
  ],
  validateRequest,
  menuController.createMenu,
);

// Update a menu by id
router.put(
  "/:id",
  [
    param("id").notEmpty().withMessage("Menu ID is required."),
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Menu name is required.").isLength({ max: EDITOR_LIMITS.maxMenuNameLength }).withMessage(`Menu name must be at most ${EDITOR_LIMITS.maxMenuNameLength} characters.`),
    body("description").optional().trim().customSanitizer(stripHtmlTags),
  ],
  validateRequest,
  menuController.updateMenu,
);

// Duplicate a menu by id
router.post(
  "/:id/duplicate",
  [param("id").notEmpty().withMessage("Menu ID is required.")],
  validateRequest,
  menuController.duplicateMenu,
);

// Delete a menu by id
router.delete("/:id", [param("id").notEmpty().withMessage("Menu ID is required.")], validateRequest, menuController.deleteMenu);

export default router;
