import express from "express";
import { getSharedAreas, saveSharedArea } from "../controllers/sharedAreaController.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

// GET /api/shared-areas?language= - The language's shared areas and their content
router.get("/", getSharedAreas);

// PUT /api/shared-areas/:id - Save one shared area of one language
router.put("/:id", saveSharedArea);

export default router;
