import express from "express";
import { body, param } from "express-validator";
import * as pageController from "../controllers/pageController.js";
import { stripHtmlTags } from "../services/sanitizationService.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { EDITOR_LIMITS } from "../limits.js";
import { standardJsonParser, editorJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(resolveActiveProject);
// NOTE: JSON body parsing is NOT applied via router.use() here because
// the page content save route (/:id/content) needs a higher limit (10 MB).
// Instead, standardJsonParser or editorJsonParser is applied per-route.

// Get all pages
router.get("/", pageController.getAllPages);

// Get a specific page
router.get("/:id", [param("id").notEmpty().withMessage("Page ID is required.")], validateRequest, pageController.getPage);

// Create a new page
router.post(
  "/",
  standardJsonParser,
  [
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Page name is required.").isLength({ max: EDITOR_LIMITS.maxPageNameLength }).withMessage(`Page name must be at most ${EDITOR_LIMITS.maxPageNameLength} characters.`),
    body("seo.description").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.og_title").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.canonical_url").optional().trim().customSanitizer(stripHtmlTags),
  ],
  validateRequest,
  pageController.createPage,
);

// Update a page
router.put(
  "/:id",
  standardJsonParser,
  [
    param("id").notEmpty().withMessage("Page ID is required."),
    body("name").trim().customSanitizer(stripHtmlTags).notEmpty().withMessage("Page name is required.").isLength({ max: EDITOR_LIMITS.maxPageNameLength }).withMessage(`Page name must be at most ${EDITOR_LIMITS.maxPageNameLength} characters.`),
    body("seo.description").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.og_title").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.canonical_url").optional().trim().customSanitizer(stripHtmlTags),
  ],
  validateRequest,
  pageController.updatePage,
);

// Delete a page
router.delete("/:id", [param("id").notEmpty().withMessage("Page ID is required.")], validateRequest, pageController.deletePage);

// Bulk delete pages
router.post(
  "/bulk-delete",
  standardJsonParser,
  [body("pageIds").isArray({ min: 1 }).withMessage("At least one page ID is required.")],
  validateRequest,
  pageController.bulkDeletePages,
);

// Duplicate a page
router.post(
  "/:id/duplicate",
  standardJsonParser,
  [param("id").notEmpty().withMessage("Page ID is required.")],
  validateRequest,
  pageController.duplicatePage,
);

// Page editor content saving — uses higher body limit for large widget JSON
router.post(
  "/:id/content",
  editorJsonParser,
  [
    param("id").notEmpty().withMessage("Page ID is required."),
    body("seo.description").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.og_title").optional().trim().customSanitizer(stripHtmlTags),
    body("seo.canonical_url").optional().trim().customSanitizer(stripHtmlTags),
  ],
  validateRequest,
  pageController.savePageContent,
);

export default router;
