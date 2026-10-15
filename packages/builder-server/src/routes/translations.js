import express from "express";
import { param } from "express-validator";

import * as translationController from "../controllers/translationController.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

router.get(
  "/:groupId",
  [param("groupId").notEmpty().withMessage("A translation group id is required.")],
  validateRequest,
  translationController.getTranslationGroup,
);

export default router;
