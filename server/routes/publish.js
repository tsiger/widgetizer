import express from "express";
import { publishProject } from "../controllers/publishController.js";

const router = express.Router();

// Route to trigger the publishing process for a project
// POST /api/publish/:projectId
router.post("/:projectId", publishProject);

export default router;
