import express from "express";
import { exportProject } from "../controllers/exportController.js";

const router = express.Router();

// Route to trigger the exporting process for a project
// POST /api/export/:projectId
router.post("/:projectId", exportProject);

export default router;
