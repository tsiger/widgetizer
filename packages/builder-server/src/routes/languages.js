import express from "express";
import { body } from "express-validator";

import * as languageController from "../controllers/languageController.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

router.post(
  "/",
  [body("code").isString().withMessage("A language code is required.")],
  validateRequest,
  languageController.createLanguage,
);

export default router;
