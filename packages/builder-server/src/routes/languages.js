import express from "express";
import { body, param } from "express-validator";

import * as languageController from "../controllers/languageController.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { standardJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

const codeParam = () =>
  param("code")
    .matches(/^[a-z]{2}(-[a-z0-9]{2,8})?$/i)
    .withMessage("code must be a language code like \"en\" or \"pt-br\".");

router.post(
  "/",
  [body("code").isString().withMessage("A language code is required.")],
  validateRequest,
  languageController.createLanguage,
);

router.get("/:code/summary", [codeParam()], validateRequest, languageController.getLanguageSummary);

router.delete("/:code", [codeParam()], validateRequest, languageController.deleteLanguage);

export default router;
