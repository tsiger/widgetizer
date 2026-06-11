import express from "express";
import * as projectController from "../controllers/projectController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// GET /widgets - widget schemas (core + theme) for the active project
router.get("/", projectController.getProjectWidgets);

export default router;
