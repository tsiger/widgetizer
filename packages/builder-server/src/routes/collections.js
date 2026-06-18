import express from "express";
import { body, param } from "express-validator";

import * as collectionController from "../controllers/collectionController.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { editorJsonParser } from "../middleware/jsonParser.js";

const router = express.Router();
router.use(editorJsonParser);
router.use(resolveActiveProject);

const slugParam = (name) =>
  param(name)
    .matches(/^[a-z0-9-]+$/)
    .withMessage(`${name} must contain lowercase letters, numbers, and hyphens only.`);

// Validates each element of a body array (e.g. `itemSlugs.*`, `order.*`) as a
// safe slug, so a crafted value like "../../pages/index" can never reach a path
// helper. Mirrors `slugParam` for body-array inputs.
const slugBody = (name) =>
  body(name)
    .isString()
    .bail()
    .matches(/^[a-z0-9-]+$/)
    .withMessage(`${name} must contain lowercase letters, numbers, and hyphens only.`);

// Schema endpoints
router.get("/schemas", collectionController.getCollectionSchemas);
router.get(
  "/schema/:collectionType",
  [slugParam("collectionType")],
  validateRequest,
  collectionController.getCollectionSchema,
);

// Item CRUD endpoints
router.get("/:collectionType", [slugParam("collectionType")], validateRequest, collectionController.getAllItems);
router.get(
  "/:collectionType/:itemSlug",
  [slugParam("collectionType"), slugParam("itemSlug")],
  validateRequest,
  collectionController.getItem,
);
router.post(
  "/:collectionType",
  [slugParam("collectionType"), body("settings").isObject().withMessage("settings must be an object.")],
  validateRequest,
  collectionController.createItem,
);
router.put(
  "/:collectionType/:itemSlug",
  [
    slugParam("collectionType"),
    slugParam("itemSlug"),
    body("settings").isObject().withMessage("settings must be an object."),
  ],
  validateRequest,
  collectionController.updateItem,
);
router.delete(
  "/:collectionType/:itemSlug",
  [slugParam("collectionType"), slugParam("itemSlug")],
  validateRequest,
  collectionController.deleteItem,
);
router.post(
  "/:collectionType/bulk-delete",
  [slugParam("collectionType"), body("itemSlugs").isArray({ min: 1 }), slugBody("itemSlugs.*")],
  validateRequest,
  collectionController.bulkDeleteItems,
);
router.post(
  "/:collectionType/:itemSlug/duplicate",
  [slugParam("collectionType"), slugParam("itemSlug")],
  validateRequest,
  collectionController.duplicateItem,
);
router.post(
  "/:collectionType/:itemSlug/discard-archived",
  [slugParam("collectionType"), slugParam("itemSlug")],
  validateRequest,
  collectionController.discardArchivedItem,
);
router.post(
  "/:collectionType/reorder",
  [slugParam("collectionType"), body("order").isArray(), slugBody("order.*")],
  validateRequest,
  collectionController.reorderItems,
);

export default router;
