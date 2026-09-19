/**
 * collectionController — REST handlers for collection schemas and items
 * (docs-llms/core-collections.md §4). Mounted at /api/collections on the
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
  extractMediaPathsFromCollectionItem,
} from "../services/mediaUsageService.js";
import { withMediaLock, assertIntroducedMediaExists } from "../services/mediaCoordination.js";
import { cleanupDeletedCollectionItemReferences } from "../utils/linkEnrichment.js";
import { requestLanguage, projectLanguageContexts } from "../utils/contentLanguage.js";
import {
  assertHasIdentity,
  assertLanguageFree,
  findItemInGroup,
  groupIdOf,
  resolveTargetLanguage,
  serializeTranslationOps,
} from "../services/translationService.js";

/** Map a service error to an HTTP response, or 500 for the unexpected. */
/**
 * Write an item and sync its media usage as one media section, so media deletion
 * (which verifies and deletes in the same section) cannot run between the two.
 * Refuses first if the item introduces a reference to a file that is already gone —
 * the save queued behind a delete, which ordering alone cannot make safe.
 *
 * @returns {Promise<boolean>} true when the item was written but its usage rows are
 *   behind. The item IS saved in that case; reporting a failed save would be false.
 */
async function writeItemInMediaSection({
  storage,
  scope,
  assetStorage,
  collectionType,
  item,
  baselineSlug = null,
  previousSlug,
  lang,
}) {
  return withMediaLock(scope.projectId, async () => {
    // Re-read the comparison baseline HERE, not from a snapshot taken before the
    // lock. A snapshot read earlier can still show a reference that another save
    // has since removed and a delete has since acted on — which classified the
    // image as "already present", skipped the check, and restored a broken
    // reference. The baseline has to be what is on disk inside this section.
    let previousItem = null;
    if (baselineSlug) {
      try {
        previousItem = await collectionService.readRawCollectionItem(
          storage,
          scope,
          collectionType,
          baselineSlug,
          lang,
        );
      } catch {
        // Unreadable: nothing is known to be pre-existing, so every path in the
        // incoming item counts as introduced. That is the cautious direction.
      }
    }

    await assertIntroducedMediaExists({
      assetStorage,
      scope,
      previousPaths: previousItem ? extractMediaPathsFromCollectionItem(previousItem) : [],
      nextPaths: extractMediaPathsFromCollectionItem(item),
    });

    await collectionService.writeCollectionItem(storage, scope, collectionType, item, previousSlug, lang);

    try {
      await syncCollectionItemMediaUsageOnWrite(scope.projectId, item, collectionType, lang);
      return false;
    } catch (usageError) {
      // Previously this propagated and answered 500 — after the item had already
      // been written. Saying the save failed when it did not is the worse lie.
      console.warn(`Failed to update media usage tracking for item ${item?.slug}:`, usageError.message);
      return true;
    }
  });
}

/** Attach the "saved, but image tracking is behind" signal without changing the body's shape. */
function withUsageWarning(body, usageStale, slug) {
  if (!usageStale) return body;
  return { ...body, warnings: [{ code: "MEDIA_USAGE_STALE", path: slug }] };
}

function respondError(res, err) {
  if (err?.name === "TranslationError") {
    return res.status(err.status).json({ error: "Version not created", message: err.message });
  }
  // Nothing was written: the item refers to a file that is no longer there.
  if (err?.code === "MEDIA_REFERENCE_MISSING") {
    return res.status(err.statusCode).json({ error: "Missing media", message: err.message, code: err.code });
  }
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

    const lang = requestLanguage(req, res);
    if (!lang) return;
    const options = {};
    if (req.query.sort) options.sort = req.query.sort;
    if (req.query.limit != null) options.limit = Number(req.query.limit);
    if (req.query.offset != null) options.offset = Number(req.query.offset);

    let items = await collectionService.listCollectionItems(storage, scope, collectionType, options, lang);
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
    const lang = requestLanguage(req, res);
    if (!lang) return;
    const item = await collectionService.readCollectionItem(storage, scope, collectionType, itemSlug, lang);
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
    const lang = requestLanguage(req, res);
    if (!lang) return;
    const cap = await req.adapters?.limits?.getLimit?.(scope, LIMIT_KEYS.MAX_COLLECTION_ITEMS);
    const maxItems = typeof cap === "number" && cap > 0 ? cap : Infinity;
    if (Number.isFinite(maxItems)) {
      // Items count physically across every language of the collection.
      let existing = 0;
      for (const each of projectLanguageContexts(req.activeProject)) {
        existing += (await collectionService.listCollectionItems(storage, scope, collectionType, {}, each)).length;
      }
      if (existing >= maxItems) {
        return res.status(422).json({ error: `This collection has reached its item limit (${maxItems}).` });
      }
    }

    const { item } = collectionService.buildCollectionItemData(schema, req.body, null);
    const usageStale = await writeItemInMediaSection({
      storage,
      scope,
      assetStorage: req.adapters.assetStorage,
      collectionType,
      item,
      baselineSlug: null,
      previousSlug: null,
      lang,
    });
    noStore(res)
      .status(201)
      .json(withUsageWarning(collectionService.normalizeCollectionItem(item, schema, lang), usageStale, item.slug));
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

    const lang = requestLanguage(req, res);
    if (!lang) return;
    const existing = await collectionService.readRawCollectionItem(storage, scope, collectionType, itemSlug, lang);
    if (!existing) return res.status(404).json({ error: "Item not found" });

    const { item, previousSlug } = collectionService.buildCollectionItemData(schema, req.body, existing);
    const usageStale = await writeItemInMediaSection({
      storage,
      scope,
      assetStorage: req.adapters.assetStorage,
      collectionType,
      item,
      baselineSlug: itemSlug,
      previousSlug,
      lang,
    });
    noStore(res).json(
      withUsageWarning(collectionService.normalizeCollectionItem(item, schema, lang), usageStale, item.slug),
    );
  } catch (err) {
    respondError(res, err);
  }
}

export async function deleteItem(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType, itemSlug } = req.params;
    const lang = requestLanguage(req, res);
    if (!lang) return;
    // Capture the uuid before deleting so menu references to it can be scrubbed (#11).
    // Best-effort: a corrupt/unreadable item must never block its own deletion.
    let existing = null;
    try {
      existing = await collectionService.readRawCollectionItem(storage, scope, collectionType, itemSlug, lang);
    } catch {
      existing = null;
    }
    const result = await collectionService.deleteCollectionItem(storage, scope, collectionType, itemSlug, lang);
    if (!result.deleted) return noStore(res).status(404).json({ error: "Item not found" });
    await removeCollectionItemFromMediaUsage(scope.projectId, { uuid: existing?.uuid, slug: itemSlug }, collectionType, lang);
    if (existing?.uuid) {
      try {
        await cleanupDeletedCollectionItemReferences(storage, scope, {
          deletedItemUuids: existing.uuid,
          defaultLanguage: lang.defaultLanguage,
        });
      } catch (cleanupError) {
        console.warn(`Failed to clean up references for deleted item ${itemSlug} (${existing.uuid}):`, cleanupError.message);
      }
    }
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
    const lang = requestLanguage(req, res);
    if (!lang) return;
    // Capture uuids before deletion so menu references can be scrubbed (#11).
    // Best-effort per item: an unreadable item is skipped, not fatal to the bulk.
    const uuidBySlug = new Map();
    for (const slug of req.body.itemSlugs || []) {
      try {
        const raw = await collectionService.readRawCollectionItem(storage, scope, collectionType, slug, lang);
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
      lang,
    );
    for (const slug of result.deleted) {
      await removeCollectionItemFromMediaUsage(scope.projectId, { uuid: uuidBySlug.get(slug), slug }, collectionType, lang);
    }
    const deletedUuids = result.deleted.map((slug) => uuidBySlug.get(slug)).filter(Boolean);
    if (deletedUuids.length > 0) {
      try {
        await cleanupDeletedCollectionItemReferences(storage, scope, {
          deletedItemUuids: deletedUuids,
          defaultLanguage: lang.defaultLanguage,
        });
      } catch (cleanupError) {
        console.warn(`Failed to clean up references for deleted items ${deletedUuids.join(", ")}:`, cleanupError.message);
      }
    }
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

    const lang = requestLanguage(req, res);
    if (!lang) return;
    const dup = await collectionService.duplicateCollectionItem(storage, scope, collectionType, itemSlug, lang);
    if (!dup) return res.status(404).json({ error: "Item not found" });
    await updateCollectionItemMediaUsage(scope.projectId, dup, collectionType, lang);
    noStore(res).status(201).json(collectionService.normalizeCollectionItem(dup, schema, lang));
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

    const lang = requestLanguage(req, res);
    if (!lang) return;
    const item = await collectionService.discardArchivedCollectionItem(storage, scope, collectionType, itemSlug, lang);
    if (!item) return res.status(404).json({ error: "Item not found" });
    // Media usage may shrink if an archived field held a media reference.
    await syncCollectionItemMediaUsageOnWrite(scope.projectId, item, collectionType, lang);
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
    const lang = requestLanguage(req, res);
    if (!lang) return;
    const result = await collectionService.reorderCollectionItems(storage, scope, collectionType, req.body.order, lang);
    noStore(res).json({ success: true, ...result });
  } catch (err) {
    respondError(res, err);
  }
}

/** Create this item's version in another language, joined to its translation group. */
export async function createItemLanguageVersion(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    const { collectionType, itemSlug } = req.params;
    const schema = await collectionService.getCollectionSchema(storage, scope, collectionType);
    if (!schema) return res.status(404).json({ error: "Collection type not found" });

    const sourceLang = requestLanguage(req, res);
    if (!sourceLang) return;
    const target = resolveTargetLanguage(req.activeProject, req.body?.targetLanguage);
    if (target.language === sourceLang.language) {
      return res.status(400).json({
        error: "Same language",
        message: "An item cannot be its own translation. Choose a different language.",
      });
    }

    const cap = await req.adapters?.limits?.getLimit?.(scope, LIMIT_KEYS.MAX_COLLECTION_ITEMS);
    const maxItems = typeof cap === "number" && cap > 0 ? cap : Infinity;

    const outcome = await serializeTranslationOps(scope.projectId, async () => {
      const source = await collectionService.readRawCollectionItem(storage, scope, collectionType, itemSlug, sourceLang);
      if (!source) return { notFound: true };

      assertHasIdentity(source, "item");
      assertLanguageFree(
        await findItemInGroup({ storage, scope, collectionType, lang: target, groupId: groupIdOf(source) }),
        target.language,
        "version",
      );

      // A translation is another item, counted physically like every other one.
      if (Number.isFinite(maxItems)) {
        let existing = 0;
        for (const each of projectLanguageContexts(req.activeProject)) {
          existing += (await collectionService.listCollectionItems(storage, scope, collectionType, {}, each)).length;
        }
        if (existing >= maxItems) return { overLimit: maxItems };
      }

      const created = await collectionService.createItemLanguageVersion(storage, scope, collectionType, itemSlug, {
        fromLang: sourceLang,
        toLang: target,
        slug: req.body?.slug,
      });
      if (!created) return { notFound: true };
      await syncCollectionItemMediaUsageOnWrite(scope.projectId, created.item, collectionType, target);
      return { item: created.item };
    });

    if (outcome.notFound) return res.status(404).json({ error: "Item not found" });
    if (outcome.overLimit) {
      return res.status(422).json({ error: `This collection has reached its item limit (${outcome.overLimit}).` });
    }
    noStore(res).status(201).json(collectionService.normalizeCollectionItem(outcome.item, schema, target));
  } catch (err) {
    respondError(res, err);
  }
}
