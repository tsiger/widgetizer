import express from "express";
import { body, param } from "express-validator";
import * as menuController from "../controllers/menuController.js";
import { stripHtmlTags } from "../services/sanitizationService.js";

const router = express.Router();

// Get all menus
router.get("/", menuController.getAllMenus);

// Get a menu by id
router.get("/:id", [param("id").notEmpty().withMessage("Menu ID is required.")], menuController.getMenu);

// Create a new menu
router.post(
  "/",
  [
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Menu name is required."),
    body("description").optional().trim().customSanitizer(stripHtmlTags),
  ],
  menuController.createMenu,
);

// Update a menu by id
router.put(
  "/:id",
  [
    param("id").notEmpty().withMessage("Menu ID is required."),
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Menu name is required."),
    body("description").optional().trim().customSanitizer(stripHtmlTags),
  ],
  menuController.updateMenu,
);

// Duplicate a menu by id
router.post(
  "/:id/duplicate",
  [param("id").notEmpty().withMessage("Menu ID is required.")],
  menuController.duplicateMenu,
);

// Delete a menu by id
router.delete("/:id", [param("id").notEmpty().withMessage("Menu ID is required.")], menuController.deleteMenu);

export default router;
