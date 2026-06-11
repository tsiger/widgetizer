import express from "express";
import * as projectController from "../controllers/projectController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// GET /icons - icon set (assets/icons.json) for the active project
router.get("/", projectController.getProjectIcons);

export default router;
