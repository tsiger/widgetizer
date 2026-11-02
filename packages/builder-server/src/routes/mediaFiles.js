import express from "express";
import { param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest.js";
import { serveProjectMedia } from "../controllers/mediaController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";

// The project's media files, as the browser loads them: `<img src>`, audio and
// video, downloads, the editor's "open in a new tab". Such a load can't carry
// the X-Project-Id header the management routes rely on, so the project id is
// in the path and `serveProjectMedia` reads it from there.
//
// Kept apart from the project-scoped media router so an embedding app that
// serves these URLs itself can leave this router out. The OSS shell mounts it
// at /api/media, giving /api/media/projects/:projectId/... — the URLs the
// editor and preview renders build.
//
// The middleware runs per route, not router-wide, so a management request
// passing through /api/media isn't scope-resolved here as well.

const router = express.Router();
const before = [standardJsonParser, resolveActiveProject];

// Serve a media file by ID
router.get(
  "/projects/:projectId/media/:fileId",
  ...before,
  [param("projectId").notEmpty(), param("fileId").notEmpty()],
  validateRequest,
  serveProjectMedia,
);

// Serve media files directly from uploads/images
router.get(
  "/projects/:projectId/uploads/images/:filename",
  ...before,
  [param("projectId").notEmpty(), param("filename").notEmpty()],
  validateRequest,
  serveProjectMedia,
);

// Serve file assets directly from uploads/files
router.get(
  "/projects/:projectId/uploads/files/:filename",
  ...before,
  [param("projectId").notEmpty(), param("filename").notEmpty()],
  validateRequest,
  serveProjectMedia,
);

export default router;
