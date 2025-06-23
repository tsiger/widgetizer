import express from "express";
import { body, param } from "express-validator";
import * as menuController from "../controllers/menuController.js";

const router = express.Router();

// Get all menus
router.get("/", menuController.getAllMenus);

// Get a menu by id
router.get("/:id", [param("id").notEmpty().withMessage("Menu ID is required.")], menuController.getMenu);

// Create a new menu
router.post(
  "/",
  [body("name").notEmpty().withMessage("Menu name is required.").trim().escape()],
  menuController.createMenu,
);

// Update a menu by id
router.put(
  "/:id",
  [
    param("id").notEmpty().withMessage("Menu ID is required."),
    body("name").notEmpty().withMessage("Menu name is required.").trim().escape(),
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
