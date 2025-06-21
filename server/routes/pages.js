import express from "express";
import * as pageController from "../controllers/pageController.js";

const router = express.Router();

// Get all pages
router.get("/", pageController.getAllPages);

// Get a specific page
router.get("/:id", pageController.getPage);

// Create a new page
router.post("/", pageController.createPage);

// Update a page
router.put("/:id", pageController.updatePage);

// Delete a page
router.delete("/:id", pageController.deletePage);

// Bulk delete pages
router.post("/bulk-delete", pageController.bulkDeletePages);

// Duplicate a page
router.post("/:id/duplicate", pageController.duplicatePage);

// age editor content saving
router.post("/:id/content", pageController.savePageContent);

export default router;
