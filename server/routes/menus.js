import express from "express";
import * as menuController from "../controllers/menuController.js";

const router = express.Router();

// Get all menus
router.get("/", menuController.getAllMenus);

// Get a menu by id
router.get("/:id", menuController.getMenu);

// Create a new menu
router.post("/", menuController.createMenu);

// Update a menu by id
router.put("/:id", menuController.updateMenu);

// Delete a menu by id
router.delete("/:id", menuController.deleteMenu);

export default router;
