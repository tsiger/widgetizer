import express from "express";
import { body, param } from "express-validator";
import * as pageController from "../controllers/pageController.js";
import { stripHtmlTags } from "../services/sanitizationService.js";

const router = express.Router();

// Get all pages
router.get("/", pageController.getAllPages);

// Get a specific page
router.get("/:id", [param("id").notEmpty().withMessage("Page ID is required.")], pageController.getPage);

// Create a new page
router.post(
  "/",
  [
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Page name is required."),
    body("seo.description").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.og_title").optional().trim().customSanitizer(stripHtmlTags),
  ],
  pageController.createPage,
);

// Update a page
router.put(
  "/:id",
  [
    param("id").notEmpty().withMessage("Page ID is required."),
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Page name is required."),
    body("seo.description").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.og_title").optional().trim().customSanitizer(stripHtmlTags),
  ],
  pageController.updatePage,
);

// Delete a page
router.delete("/:id", [param("id").notEmpty().withMessage("Page ID is required.")], pageController.deletePage);

// Bulk delete pages
router.post(
  "/bulk-delete",
  [body("pageIds").isArray({ min: 1 }).withMessage("At least one page ID is required.")],
  pageController.bulkDeletePages,
);

// Duplicate a page
router.post(
  "/:id/duplicate",
  [param("id").notEmpty().withMessage("Page ID is required.")],
  pageController.duplicatePage,
);

// Page editor content saving
router.post(
  "/:id/content",
  [
    param("id").notEmpty().withMessage("Page ID is required."),
    body("seo.description").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.og_title").optional().trim().customSanitizer(stripHtmlTags),
  ],
  pageController.savePageContent,
);

export default router;
