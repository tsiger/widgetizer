import express from "express";
import * as menuController from "../controllers/menuController.js";

const router = express.Router();

// Get all menus
router.get("/", menuController.getAllMenus);

// Get a menu by slug
router.get("/:slug", menuController.getMenu);

// Create a new menu
router.post("/", menuController.createMenu);

// Update a menu by slug
router.put("/:slug", menuController.updateMenu);

// Delete a menu by slug
router.delete("/:slug", menuController.deleteMenu);

export default router;
