import express from "express";
import { body, param } from "express-validator";
import * as reusableBlocksController from "../controllers/reusableBlocksController.js";

const router = express.Router();

// Get all reusable blocks
router.get("/", reusableBlocksController.getAllBlocks);

// Get a specific reusable block
router.get(
  "/:id",
  [param("id").notEmpty().withMessage("Block ID is required.")],
  reusableBlocksController.getBlock
);

// Create a new reusable block (from existing widget)
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Block name is required.").trim(),
    body("widgetData").exists().withMessage("Widget data is required."),
  ],
  reusableBlocksController.createBlock
);

// Update a reusable block
router.put(
  "/:id",
  [
    param("id").notEmpty().withMessage("Block ID is required."),
    body("widgetData").exists().withMessage("Widget data is required."),
  ],
  reusableBlocksController.updateBlock
);

// Delete a reusable block
router.delete(
  "/:id",
  [param("id").notEmpty().withMessage("Block ID is required.")],
  reusableBlocksController.deleteBlock
);

// Get usage count (pages using this block)
router.get(
  "/:id/usage",
  [param("id").notEmpty().withMessage("Block ID is required.")],
  reusableBlocksController.getBlockUsage
);

export default router;
