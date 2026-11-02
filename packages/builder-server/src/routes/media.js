import express from "express";
import { param, body } from "express-validator";
import { stripHtmlToText } from "../services/sanitizationService.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getProjectMedia,
  uploadProjectMedia,
  deleteProjectMedia,
  uploadWithLimit,
  bulkDeleteProjectMedia,
  updateMediaMetadata,
  getMediaFileUsage,
  refreshMediaUsage,
} from "../controllers/mediaController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// --- Active-project-scoped media management. These are XHR/fetch calls that
// carry the X-Project-Id header, so the active project is resolved via
// req.scope and the project id stays out of the path (hosted serves the same
// routes under /api/projects/:projectId via the project-scoped router). ---

// Get all media for the active project
router.get("/", getProjectMedia);

// Upload media to the active project (per-request multer with a fileSize cap
// sourced from the limits adapter).
router.post("/", uploadWithLimit, uploadProjectMedia);

// Bulk delete media files
router.post("/bulk-delete", [body("fileIds").isArray({ min: 1 })], validateRequest, bulkDeleteProjectMedia);

// Refresh media usage tracking
router.post("/refresh-usage", refreshMediaUsage);

// Get media file usage
router.get("/:fileId/usage", [param("fileId").notEmpty()], validateRequest, getMediaFileUsage);

// Delete a media file
router.delete("/:fileId", [param("fileId").notEmpty()], validateRequest, deleteProjectMedia);

// Update a file's alt text, title and caption (per language via ?language=).
//
// `null` is not a value to clean — it is the request saying "inherit the default
// language". Trimming it would turn it into a deliberate blank, which is a
// different thing on disk and to a screen reader. Exported so that rule can be
// tested on its own; the controller never sees what this strips.
export const metadataValidators = [
  param("fileId").notEmpty(),
  body("alt").optional({ nullable: true }).trim().customSanitizer(stripHtmlToText),
  body("title").optional({ nullable: true }).trim().customSanitizer(stripHtmlToText),
  body("caption").optional({ nullable: true }).trim().customSanitizer(stripHtmlToText),
];

router.put("/:fileId/metadata", metadataValidators, validateRequest, updateMediaMetadata);

// The files themselves are served by routes/mediaFiles.js: browser loads
// (<img src>, downloads) can't carry the X-Project-Id header, so those routes
// keep the project id in the path and are mounted separately.

export default router;
