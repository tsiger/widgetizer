import express from "express";
import { publishProject, getPublishStatus } from "../controllers/publishController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);

// POST /api/publish/:projectId — Publish project to hosted platform
router.post("/:projectId", publishProject);

// GET /api/publish/status/:projectId — Get publish status for a project
router.get("/status/:projectId", getPublishStatus);

export default router;
