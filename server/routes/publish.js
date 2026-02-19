import express from "express";
import { publishProject, getPublishStatus } from "../controllers/publishController.js";

const router = express.Router();

// POST /api/publish/:projectId — Publish project to hosted platform
router.post("/:projectId", publishProject);

// GET /api/publish/status/:projectId — Get publish status for a project
router.get("/status/:projectId", getPublishStatus);

export default router;
