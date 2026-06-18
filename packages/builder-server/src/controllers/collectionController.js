/**
 * collectionController — REST handlers for collection schemas and items
 * (Collections spec Section 10). Mounted at /api/collections on the
 * project-scoped router, so every handler runs after resolveActiveProject and
 * has `req.scope` (the resolved tenant scope) + `req.adapters` available.
 *
 * Scope-first: collection content I/O goes through `collectionService` over
 * `req.adapters.storage` + `req.scope` (so hosted inherits these routes with its
 * own cloud storage adapter). Media-usage tracking is SQLite metadata keyed by
 * `scope.projectId`; cross-reference cleanup is fs-based by `scope.folderName`
 * (the OSS-internal enrichment path).
 *
 * Write responses set `Cache-Control: no-store`; the frontend refetches.
 */

import { LIMIT_KEYS } from "@widgetizer/core/adapters";
import * as collectionService from "../services/collectionService.js";
import {
  syncCollectionItemMediaUsageOnWrite,
  updateCollectionItemMediaUsage,
  removeCollectionItemFromMediaUsage,
} from "../services/mediaUsageService.js";
import { cleanupDeletedCollectionItemReferences } from "../utils/linkEnrichment.js";

/** Map a service error to an HTTP response, or 500 for the unexpected. */
function respondError(res, err) {
  if (err?.code === "VALIDATION") {
    return res.status(400).json({ error: "Validation failed", validationErrors: err.validationErrors });
  }
  if (err?.code === "SLUG_CONFLICT") {
    return res
      .status(409)
      .json({ error: "Slug already exists", message: err.message, conflictingSlug: err.conflictingSlug });
  }
  console.error("[collections] controller error:", err);
  return res.status(500).json({ error: "Internal server error" });
}

function noStore(res) {
  res.set("Cache-Control", "no-store");
  return res;
}

// --- Schemas ---------------------------------------------------------------

export async function getCollectionSchemas(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const schemas = await collectionService.listCollectionSchemas(storage, scope);
    res.json(schemas);
  } catch (err) {
    respondError(res, err);
  }
}

export async function getCollectionSchema(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const schema = await collectionService.getCollectionSchema(storage, scope, req.params.collectionType);
    if (!schema) return res.status(404).json({ error: "Collection type not found" });
    res.json(schema);
  } catch (err) {
    respondError(res, err);
  }
}

// --- Item reads ------------------------------------------------------------

export async function getAllItems(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType } = req.params;
    const schema = await collectionService.getCollectionSchema(storage, scope, collectionType);
    if (!schema) return res.status(404).json({ error: "Collection type not found" });

    const options = {};
    if (req.query.sort) options.sort = req.query.sort;
    if (req.query.limit != null) options.limit = Number(req.query.limit);
    if (req.query.offset != null) options.offset = Number(req.query.offset);

    let items = await collectionService.listCollectionItems(storage, scope, collectionType, options);
    if (req.query.invalid === "true") items = items.filter((i) => i.invalid);
    res.json(items);
  } catch (err) {
    respondError(res, err);
  }
}

export async function getItem(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType, itemSlug } = req.params;
    const item = await collectionService.readCollectionItem(storage, scope, collectionType, itemSlug);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    respondError(res, err);
  }
}

// --- Item writes -----------------------------------------------------------

export async function createItem(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType } = req.params;
    const schema = await collectionService.getCollectionSchema(storage, scope, collectionType);
    if (!schema) return res.status(404).json({ error: "Collection type not found" });

    // DoS guard: bound items-per-collection via the limits adapter (hosted tier
    // ceiling; OSS → Infinity, so the count is skipped and create pays no extra
    // I/O). Without this an authenticated owner could persist unbounded items
    // that the export-time enumeration then re-reads on every publish.
    const cap = await req.adapters?.limits?.getLimit?.(scope, LIMIT_KEYS.MAX_COLLECTION_ITEMS);
    const maxItems = typeof cap === "number" && cap > 0 ? cap : Infinity;
    if (Number.isFinite(maxItems)) {
      const existing = await collectionService.listCollectionItems(storage, scope, collectionType);
      if (existing.length >= maxItems) {
        return res.status(422).json({ error: `This collection has reached its item limit (${maxItems}).` });
      }
    }

    const { item } = collectionService.buildCollectionItemData(schema, req.body, null);
    await collectionService.writeCollectionItem(storage, scope, collectionType, item, null);
    await syncCollectionItemMediaUsageOnWrite(scope.projectId, collectionType, item.slug, item, null);
    noStore(res).status(201).json(collectionService.normalizeCollectionItem(item, schema));
  } catch (err) {
    respondError(res, err);
  }
}

export async function updateItem(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType, itemSlug } = req.params;
    const schema = await collectionService.getCollectionSchema(storage, scope, collectionType);
    if (!schema) return res.status(404).json({ error: "Collection type not found" });

    const existing = await collectionService.readRawCollectionItem(storage, scope, collectionType, itemSlug);
    if (!existing) return res.status(404).json({ error: "Item not found" });

    const { item, previousSlug } = collectionService.buildCollectionItemData(schema, req.body, existing);
    await collectionService.writeCollectionItem(storage, scope, collectionType, item, previousSlug);
    await syncCollectionItemMediaUsageOnWrite(scope.projectId, collectionType, item.slug, item, previousSlug);
    noStore(res).json(collectionService.normalizeCollectionItem(item, schema));
  } catch (err) {
    respondError(res, err);
  }
}

export async function deleteItem(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType, itemSlug } = req.params;
    // Capture the uuid before deleting so menu references to it can be scrubbed (#11).
    // Best-effort: a corrupt/unreadable item must never block its own deletion.
    let existing = null;
    try {
      existing = await collectionService.readRawCollectionItem(storage, scope, collectionType, itemSlug);
    } catch {
      existing = null;
    }
    const result = await collectionService.deleteCollectionItem(storage, scope, collectionType, itemSlug);
    if (!result.deleted) return noStore(res).status(404).json({ error: "Item not found" });
    await removeCollectionItemFromMediaUsage(scope.projectId, collectionType, itemSlug);
    if (existing?.uuid) await cleanupDeletedCollectionItemReferences(scope.folderName, existing.uuid);
    noStore(res).json({ success: true, slug: itemSlug });
  } catch (err) {
    respondError(res, err);
  }
}

export async function bulkDeleteItems(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType } = req.params;
    // Capture uuids before deletion so menu references can be scrubbed (#11).
    // Best-effort per item: an unreadable item is skipped, not fatal to the bulk.
    const uuidBySlug = new Map();
    for (const slug of req.body.itemSlugs || []) {
      try {
        const raw = await collectionService.readRawCollectionItem(storage, scope, collectionType, slug);
        if (raw?.uuid) uuidBySlug.set(slug, raw.uuid);
      } catch {
        // skip cleanup for this slug; deletion still proceeds below
      }
    }
    const result = await collectionService.bulkDeleteCollectionItems(
      storage,
      scope,
      collectionType,
      req.body.itemSlugs,
    );
    for (const slug of result.deleted) {
      await removeCollectionItemFromMediaUsage(scope.projectId, collectionType, slug);
    }
    const deletedUuids = result.deleted.map((slug) => uuidBySlug.get(slug)).filter(Boolean);
    if (deletedUuids.length > 0) await cleanupDeletedCollectionItemReferences(scope.folderName, deletedUuids);
    const partial = result.notFound.length > 0 || result.errors.length > 0;
    noStore(res)
      .status(partial ? 207 : 200)
      .json(result);
  } catch (err) {
    respondError(res, err);
  }
}

export async function duplicateItem(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType, itemSlug } = req.params;
    const schema = await collectionService.getCollectionSchema(storage, scope, collectionType);
    if (!schema) return res.status(404).json({ error: "Collection type not found" });

    const dup = await collectionService.duplicateCollectionItem(storage, scope, collectionType, itemSlug);
    if (!dup) return res.status(404).json({ error: "Item not found" });
    await updateCollectionItemMediaUsage(scope.projectId, collectionType, dup.slug, dup);
    noStore(res).status(201).json(collectionService.normalizeCollectionItem(dup, schema));
  } catch (err) {
    respondError(res, err);
  }
}

export async function discardArchivedItem(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType, itemSlug } = req.params;
    const schema = await collectionService.getCollectionSchema(storage, scope, collectionType);
    if (!schema) return res.status(404).json({ error: "Collection type not found" });

    const item = await collectionService.discardArchivedCollectionItem(storage, scope, collectionType, itemSlug);
    if (!item) return res.status(404).json({ error: "Item not found" });
    // Media usage may shrink if an archived field held a media reference.
    await syncCollectionItemMediaUsageOnWrite(scope.projectId, collectionType, item.slug, item, null);
    noStore(res).json(item);
  } catch (err) {
    respondError(res, err);
  }
}

export async function reorderItems(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType } = req.params;
    const result = await collectionService.reorderCollectionItems(storage, scope, collectionType, req.body.order);
    noStore(res).json({ success: true, ...result });
  } catch (err) {
    respondError(res, err);
  }
}
