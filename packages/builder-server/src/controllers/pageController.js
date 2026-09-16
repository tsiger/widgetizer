import { randomUUID } from "crypto";
import { syncPageMediaUsageOnDelete, syncPageMediaUsageOnWrite } from "../services/mediaUsageService.js";
import { cleanupDeletedPageReferences } from "../utils/linkEnrichment.js";
import { stripHtmlToText } from "../services/sanitizationService.js";
import { LIMIT_KEYS, MAX_WIDGETS_PER_PAGE } from "@widgetizer/core/adapters";
import { sanitizeSlug, generateUniqueSlug } from "../utils/slugHelpers.js";
import { generateCopyName } from "../utils/namingHelpers.js";
import { isReservedPageSlug, pageKey, pagesDir } from "@widgetizer/core/contentAddress";
import { requestLanguage, projectLanguageContexts, withoutLanguage } from "../utils/contentLanguage.js";

const pageSlugTaken = (storage, scope, lang) => (slug) =>
  isReservedPageSlug(slug, lang) || storage.exists(scope, pageKey(slug, lang));

async function listPageFiles(storage, scope, lang) {
  return (await storage.list(scope, pagesDir(lang))).filter((name) => name.endsWith(".json"));
}

function reservedPageSlug(res, slug) {
  return res.status(400).json({
    error: "Reserved slug",
    message: `"${slug}" is reserved and cannot be used as a page filename.`,
  });
}

async function readWidgetSchema(storage, scope, type) {
  if (typeof type !== "string" || !type) return null;
  try {
    const buf = await storage.read(scope, `widgets/${type}/schema.json`);
    return buf == null ? null : JSON.parse(buf.toString("utf8"));
  } catch {
    return null;
  }
}

async function enforcePaginationRules({ scope, storage, widgets }) {
  const paginators = [];
  for (const widget of Object.values(widgets || {})) {
    if (widget?.settings?.paginate !== true) continue;
    const schema = await readWidgetSchema(storage, scope, widget.type);
    const perPageSetting = schema?.collection?.perPageSetting;
    if (!schema?.collection?.type || typeof perPageSetting !== "string" || !Array.isArray(schema.settings)) {
      widget.settings.paginate = false;
      continue;
    }
    const declared = schema.settings.find((setting) => setting?.id === perPageSetting);
    const perPage = Number(widget.settings[perPageSetting] ?? declared?.default);
    if (!Number.isInteger(perPage) || perPage < 1) {
      return "Items per page must be a whole number of at least 1 when a list is split into pages.";
    }
    paginators.push(widget);
  }
  if (paginators.length > 1) return "Only one widget per page can split the page into pages.";
  for (const widget of paginators) widget.settings.listing_anchor = true;
  return null;
}

// Page/global-widget reads moved to the dir-explicit reader family
// (utils/projectContentFs.js: listPagesFromDir / readGlobalWidgetFromDir) — the
// render path consumes those against the project working dir, and
// the request boundary (getAllPages below, getPage, etc.) reads through the
// scope-aware storage adapter. No folderName-based fs readers live here anymore.

async function persistPageWithMediaTracking({ scope, storage, pageId, pageData, previousPageId = null, lang }) {
  await storage.write(scope, pageKey(pageId, lang), JSON.stringify(withoutLanguage(pageData), null, 2));

  if (previousPageId && previousPageId !== pageId) {
    try {
      if (await storage.exists(scope, pageKey(previousPageId, lang))) {
        await storage.delete(scope, pageKey(previousPageId, lang));
      }
    } catch (unlinkError) {
      console.warn(`Failed to delete old page file ${previousPageId} after slug change: ${unlinkError.message}`);
    }
  }

  try {
    await syncPageMediaUsageOnWrite(scope.projectId, pageData, lang);
  } catch (usageError) {
    console.warn(`Failed to update media usage tracking for page ${pageId}:`, usageError);
  }
}

async function deletePageWithMediaTracking({ scope, storage, pageId, lang }) {
  // Usage rows are keyed by uuid, so read it while the file still exists. A page with
  // no uuid was recorded under its slug, which the service resolves from the slug below.
  let pageUuid = null;
  try {
    const buf = await storage.read(scope, pageKey(pageId, lang));
    if (buf != null) pageUuid = JSON.parse(buf.toString("utf8"))?.uuid ?? null;
  } catch (readError) {
    console.warn(`Could not read page ${pageId} before delete for media usage: ${readError.message}`);
  }

  await storage.delete(scope, pageKey(pageId, lang));

  try {
    await syncPageMediaUsageOnDelete(scope.projectId, { uuid: pageUuid, slug: pageId }, lang);
  } catch (usageError) {
    console.warn(`Failed to update media usage tracking for deleted page ${pageId}:`, usageError);
  }
}

/**
 * Retrieves a single page by its slug from the active project.
 * @param {import('express').Request} req - Express request object with page slug in params.id
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getPage(req, res) {
  try {
    const { id } = req.params; // This is the slug
    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    const pageData = await storage.read(scope, pageKey(id, lang));
    if (pageData == null) {
      return res.status(404).json({ error: "Page not found" });
    }
    return res.json({ ...JSON.parse(pageData.toString("utf8")), language: lang.language });
  } catch (error) {
    console.error("Error getting page:", error);
    res.status(500).json({ error: "Failed to get page" });
  }
}

/**
 * Updates an existing page's metadata and content, handling slug changes and file renaming.
 * @param {import('express').Request} req - Express request object with page slug in params.id and page data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updatePage(req, res) {
  try {
    const oldSlug = req.params.id; // The slug used to identify the file to update
    const pageData = req.body; // Contains potentially new name and slug
    let desiredNewSlug = pageData.slug; // The slug the user wants

    // Defensive sanitization for SEO fields
    if (pageData.seo) {
      if (pageData.seo.description != null) pageData.seo.description = stripHtmlToText(pageData.seo.description);
      if (pageData.seo.og_title != null) pageData.seo.og_title = stripHtmlToText(pageData.seo.og_title);
      if (pageData.seo.canonical_url != null) pageData.seo.canonical_url = stripHtmlToText(pageData.seo.canonical_url);
    }

    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Fallback: If slug is missing/empty, generate from name
    if (!desiredNewSlug || typeof desiredNewSlug !== "string" || desiredNewSlug.trim() === "") {
      if (!pageData.name || typeof pageData.name !== "string" || pageData.name.trim() === "") {
        return res.status(400).json({ error: "Page name or slug is required for update" });
      }
      // Generate slug from name ONLY if slug is not provided
      console.warn(
        `Missing/empty slug in update request for oldSlug '${oldSlug}', generating from name: '${pageData.name}'`,
      );
      desiredNewSlug = await generateUniqueSlug(pageData.name, pageSlugTaken(storage, scope, lang));
    } else {
      // Sanitize the provided slug through the shared helper
      desiredNewSlug = sanitizeSlug(desiredNewSlug);
      if (!desiredNewSlug) {
        return res
          .status(400)
          .json({ error: "Invalid slug provided. Slug cannot be empty or contain only invalid characters." });
      }
    }

    let finalNewSlug = oldSlug; // Assume slug doesn't change initially

    // Check if the desired slug (after potential generation/sanitization) is different from the old one
    if (oldSlug !== desiredNewSlug) {
      // For explicit slug changes, check if the new slug already exists (conflict)
      if (pageData.slug && typeof pageData.slug === "string" && pageData.slug.trim() !== "") {
        if (isReservedPageSlug(desiredNewSlug, lang)) return reservedPageSlug(res, desiredNewSlug);
        if (await storage.exists(scope, pageKey(desiredNewSlug, lang))) {
          return res.status(409).json({
            error: "Slug already exists",
            message: `A page with the slug "${desiredNewSlug}" already exists. Please choose a different slug.`,
          });
        }
        finalNewSlug = desiredNewSlug;
      } else {
        finalNewSlug = desiredNewSlug; // Already unique from generateUniqueSlug fallback
      }
    } else {
      // Slug hasn't changed, keep it as is
      finalNewSlug = oldSlug;
    }

    if (pageData.widgets) {
      const paginationError = await enforcePaginationRules({ scope, storage, widgets: pageData.widgets });
      if (paginationError) return res.status(422).json({ error: paginationError });
    }

    // Read old file first to preserve original creation date and uuid
    let originalCreationDate = new Date().toISOString();
    let existingUuid = null;
    let existingGroupId = null;
    let existingWidgets = {};
    try {
      const oldBuf = await storage.read(scope, pageKey(oldSlug, lang));
      if (oldBuf != null) {
        const oldData = JSON.parse(oldBuf.toString("utf8"));
        originalCreationDate = oldData.created || originalCreationDate;
        existingUuid = oldData.uuid || null; // Preserve stable uuid across renames
        existingGroupId = oldData.translationGroupId || null;
        existingWidgets = oldData.widgets || {}; // Preserve widgets if not included in request
      }
      // If old file doesn't exist (e.g. first save after create error, or manual rename), allow creation
    } catch (readError) {
      console.warn(`Could not read old page file ${oldSlug} during update: ${readError.message}`);
    }

    // Construct the final page data for saving
    const resolvedUuid = existingUuid || randomUUID();
    // A page cannot be its own parent. The picker never offers it, and the
    // breadcrumb builder would drop the loop anyway, but a direct API call
    // should not be able to write it.
    const parentPageUuid =
      typeof pageData.parentPageUuid === "string" &&
      pageData.parentPageUuid.trim() &&
      pageData.parentPageUuid !== resolvedUuid
        ? pageData.parentPageUuid.trim()
        : undefined;

    const finalUpdatedPageData = {
      ...pageData, // Start with submitted data
      parentPageUuid, // undefined drops the key entirely when cleared
      uuid: resolvedUuid, // Preserve existing uuid or generate new one if missing
      translationGroupId: existingGroupId || resolvedUuid,
      language: lang.language,
      id: finalNewSlug, // Use the final unique slug as ID
      slug: finalNewSlug, // Use the final unique slug
      name: pageData.name || `Page ${finalNewSlug}`, // Ensure name exists
      widgets: pageData.widgets || existingWidgets, // Use submitted widgets or keep existing
      created: originalCreationDate, // Preserve original creation date
      updated: new Date().toISOString(), // Set new update timestamp
    };

    await persistPageWithMediaTracking({
      scope,
      storage,
      pageId: finalNewSlug,
      pageData: finalUpdatedPageData,
      previousPageId: oldSlug,
      lang,
    });

    const movedFrom = pageData.widgets
      ? await clearListingAnchorsElsewhere({
          scope,
          storage,
          keepPageId: finalNewSlug,
          widgets: finalUpdatedPageData.widgets,
          lang,
        })
      : [];

    res.json({
      success: true,
      data: finalUpdatedPageData,
      ...(movedFrom.length ? { listingAnchorMovedFrom: movedFrom } : {}),
    });
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update page",
      message: error.message,
    });
  }
}

/**
 * Retrieves all pages for the active project.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAllPages(req, res) {
  // No validation needed for this route
  try {
    const { scope } = req;
    const { storage } = req.adapters;

    // Read the page list via the storage adapter so it resolves the same scope
    // (and tenant-namespaced path) as every other page handler — `getProjectDir`
    // would resolve a different root in shells that namespace per actor. The
    // `global/` subdir is skipped because it isn't a `.json` entry. (The render
    // path reads the same files via the dir-explicit listPagesFromDir, which runs
    // without req.adapters against the project working directory.)
    const pages = [];
    for (const lang of projectLanguageContexts(req.activeProject)) {
      const pageFiles = await listPageFiles(storage, scope, lang);
      const loaded = await Promise.all(
        pageFiles.map(async (name) => {
          const pageId = name.replace(/\.json$/, "");
          try {
            const buf = await storage.read(scope, pageKey(pageId, lang));
            return buf == null ? null : { ...JSON.parse(buf.toString("utf8")), id: pageId, language: lang.language };
          } catch (readError) {
            console.error(`Error reading or parsing page file ${name}:`, readError);
            return null;
          }
        }),
      );
      pages.push(...loaded.filter((page) => page !== null));
    }

    res.json(pages);
  } catch (error) {
    // Keep existing error handling for the route
    console.error("Error in getAllPages route:", error);
    res.status(500).json({ error: "Failed to get pages" });
  }
}

/**
 * Deletes a page from the active project and updates media usage tracking.
 * @param {import('express').Request} req - Express request object with page ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deletePage(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;

    const pageId = req.params.id;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Read the page (existence + UUID for reference cleanup) before deleting
    const pageBuf = await storage.read(scope, pageKey(pageId, lang));
    if (pageBuf == null) {
      return res.status(404).json({ error: "Page not found" });
    }

    let deletedPageUuid = null;
    try {
      deletedPageUuid = JSON.parse(pageBuf.toString("utf8")).uuid || null;
    } catch (readError) {
      console.warn(`Could not read page UUID before deletion for ${pageId}:`, readError.message);
    }

    await deletePageWithMediaTracking({ scope, storage, pageId, lang });

    // Clean up orphaned references in menus and widget links, via the scope-aware
    // storage adapter so this runs against the correct per-tenant tree in hosted
    // (Cloud) and DATA_DIR in OSS (Local).
    if (deletedPageUuid) {
      try {
        await cleanupDeletedPageReferences(storage, scope, { deletedPageUuid, defaultLanguage: lang.defaultLanguage });
      } catch (cleanupError) {
        console.warn(`Failed to clean up references for deleted page ${pageId}:`, cleanupError.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Failed to delete page" });
  }
}

/**
 * Deletes multiple pages from the active project in a single operation.
 * Returns detailed results including deleted, not found, and errored pages.
 * @param {import('express').Request} req - Express request object with pageIds array in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function bulkDeletePages(req, res) {
  const { pageIds } = req.body;
  const { scope } = req;
  const { storage } = req.adapters;
  const lang = requestLanguage(req, res);
  if (!lang) return;

  const results = {
    deleted: [],
    notFound: [],
    errors: [],
  };

  const deletedUuids = [];

  // Process each page deletion
  for (const pageId of pageIds) {
    try {
      // Read the page (existence + UUID for reference cleanup) before deleting
      const pageBuf = await storage.read(scope, pageKey(pageId, lang));
      if (pageBuf == null) {
        results.notFound.push(pageId);
        continue;
      }

      try {
        const pageData = JSON.parse(pageBuf.toString("utf8"));
        if (pageData.uuid) deletedUuids.push(pageData.uuid);
      } catch (readError) {
        console.warn(`Could not read page UUID before deletion for ${pageId}:`, readError.message);
      }

      await deletePageWithMediaTracking({ scope, storage, pageId, lang });

      results.deleted.push(pageId);
    } catch (error) {
      console.error(`Error deleting page ${pageId}:`, error);
      results.errors.push({ pageId, error: error.message });
    }
  }

  // Clean up orphaned references for all deleted pages (per-tenant dir via the adapter).
  for (const uuid of deletedUuids) {
    try {
      await cleanupDeletedPageReferences(storage, scope, {
        deletedPageUuid: uuid,
        defaultLanguage: lang.defaultLanguage,
      });
    } catch (cleanupError) {
      console.warn(`Failed to clean up references for deleted page UUID ${uuid}:`, cleanupError.message);
    }
  }

  // Determine response status based on results
  const hasErrors = results.errors.length > 0 || results.notFound.length > 0;
  const hasSuccesses = results.deleted.length > 0;

  if (hasSuccesses && !hasErrors) {
    // All deletions successful
    res.json({
      success: true,
      message: `Successfully deleted ${results.deleted.length} page(s)`,
      results,
    });
  } else if (hasSuccesses && hasErrors) {
    // Partial success
    res.status(207).json({
      success: false,
      message: `Deleted ${results.deleted.length} page(s), but encountered ${results.errors.length + results.notFound.length} error(s)`,
      results,
    });
  } else {
    // No successes
    res.status(400).json({
      success: false,
      message: "Failed to delete any pages",
      results,
    });
  }
}

/**
 * Creates a new page in the active project with an auto-generated or provided slug.
 * @param {import('express').Request} req - Express request object with page data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function createPage(req, res) {
  try {
    const pageData = req.body; // Get all data including SEO
    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Defensive sanitization for SEO fields
    if (pageData.seo) {
      if (pageData.seo.description != null) pageData.seo.description = stripHtmlToText(pageData.seo.description);
      if (pageData.seo.og_title != null) pageData.seo.og_title = stripHtmlToText(pageData.seo.og_title);
      if (pageData.seo.canonical_url != null) pageData.seo.canonical_url = stripHtmlToText(pageData.seo.canonical_url);
    }

    // Defensive check: ensure name is not empty after sanitization
    if (!pageData.name || typeof pageData.name !== "string" || pageData.name.trim() === "") {
      return res.status(400).json({ error: "Page name is required." });
    }

    // Use submitted slug if provided, otherwise generate from name
    let slug;
    if (pageData.slug && pageData.slug.trim()) {
      // User provided a slug, ensure it's unique
      slug = await generateUniqueSlug(pageData.slug, pageSlugTaken(storage, scope, lang), { fallback: "page" });
    } else {
      // No slug provided, generate from name
      slug = await generateUniqueSlug(pageData.name, pageSlugTaken(storage, scope, lang));
    }

    const uuid = randomUUID();
    const newPage = {
      ...pageData, // Include all submitted data (name, seo, etc.)
      uuid, // Stable identifier that persists across renames
      translationGroupId: uuid,
      language: lang.language,
      id: slug,
      slug,
      widgets: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // storage.write creates parent directories as needed.
    await persistPageWithMediaTracking({
      scope,
      storage,
      pageId: slug,
      pageData: newPage,
      lang,
    });

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({ error: "Failed to create page" });
  }
}

/**
 * Saves page content from the page editor, including widgets and SEO data.
 * Handles slug changes and updates media usage tracking.
 * @param {import('express').Request} req - Express request object with page ID in params and page data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function savePageContent(req, res) {
  const { id } = req.params;
  try {
    const pageData = req.body; // Get all data including SEO

    // Defensive sanitization for SEO fields
    if (pageData.seo) {
      if (pageData.seo.description != null) pageData.seo.description = stripHtmlToText(pageData.seo.description);
      if (pageData.seo.og_title != null) pageData.seo.og_title = stripHtmlToText(pageData.seo.og_title);
      if (pageData.seo.canonical_url != null) pageData.seo.canonical_url = stripHtmlToText(pageData.seo.canonical_url);
    }

    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Validate essential data
    if (!pageData.slug || !pageData.name || !pageData.widgets) {
      return res.status(400).json({ error: "Missing required page data (slug, name, widgets)." });
    }
    if (pageData.slug !== id && isReservedPageSlug(pageData.slug, lang)) return reservedPageSlug(res, pageData.slug);

    // Cap the per-page widget count before persisting. Without this an
    // authenticated owner could store tens of thousands of widgets in one page,
    // which then re-renders on every publish/preview. The
    // ceiling comes from the limits adapter (hosted: a platform constant; OSS:
    // Infinity → unbounded). Count the larger of the order array and the widget
    // map so an oversized map without a matching order is still rejected.
    const widgetCount = Math.max(
      Array.isArray(pageData.widgetsOrder) ? pageData.widgetsOrder.length : 0,
      pageData.widgets && typeof pageData.widgets === "object" ? Object.keys(pageData.widgets).length : 0,
    );
    const widgetCap = await req.adapters?.limits?.getLimit?.(req.scope, LIMIT_KEYS.MAX_WIDGETS_PER_PAGE);
    const maxWidgets = typeof widgetCap === "number" && widgetCap > 0 ? widgetCap : MAX_WIDGETS_PER_PAGE;
    if (Number.isFinite(maxWidgets) && widgetCount > maxWidgets) {
      return res
        .status(422)
        .json({ error: `Too many widgets on this page (${widgetCount}); the maximum is ${maxWidgets}.` });
    }

    const paginationError = await enforcePaginationRules({ scope, storage, widgets: pageData.widgets });
    if (paginationError) return res.status(422).json({ error: paginationError });

    // Read existing data to preserve timestamps etc.
    let existingData = {};
    let loadedExisting = false;
    try {
      const buf = await storage.read(scope, pageKey(id, lang));
      if (buf != null) {
        existingData = JSON.parse(buf.toString("utf8"));
        loadedExisting = true;
      }
    } catch (err) {
      console.warn(`Error reading existing page data for ${id}:`, err);
      // Decide if this should be a fatal error
    }
    // If the file didn't exist (or couldn't be read/parsed), set default created timestamp
    if (!loadedExisting && !existingData.created) {
      existingData.created = new Date().toISOString();
    }

    // Combine existing data with new content, preserving all fields including SEO
    const updatedPageData = {
      ...existingData, // Start with existing data
      ...pageData, // Override with new data (including SEO)
      uuid: existingData.uuid || randomUUID(), // Preserve existing uuid or generate if missing
      id: pageData.slug, // Use slug from request body as the ID
      created: existingData.created, // Always preserve original creation date
      updated: new Date().toISOString(), // Set new update timestamp
    };
    updatedPageData.translationGroupId = existingData.translationGroupId || updatedPageData.uuid;

    await persistPageWithMediaTracking({
      scope,
      storage,
      pageId: pageData.slug,
      pageData: updatedPageData,
      previousPageId: id,
      lang,
    });

    // One listing anchor per collection. Swept on save rather than when the
    // checkbox is ticked: the editor holds the change until save, so clearing
    // other pages earlier would strip an anchor for an edit the user then
    // discarded. Runs after the write so the page that claimed the anchor is
    // the one that keeps it.
    const movedFrom = await clearListingAnchorsElsewhere({
      scope,
      storage,
      keepPageId: pageData.slug,
      widgets: updatedPageData.widgets,
      lang,
    });

    res.json({
      success: true,
      message: "Page saved successfully",
      ...(movedFrom.length ? { listingAnchorMovedFrom: movedFrom } : {}),
    });
  } catch (error) {
    console.error(`Error saving page content for ${id}:`, error);
    res.status(500).json({ error: "Failed to save page content" });
  }
}

/**
 * Clear `listing_anchor` (and `paginate`, which needs it) on every OTHER page for the collections the just-saved
 * page claims, so a collection has exactly one anchor. Returns the names of the
 * pages it cleared, for the editor to report.
 *
 * Which collection a widget lists comes from its schema's `collection.type`, so
 * a widget whose schema does not declare one can never hold an anchor. Each
 * language has its own listing pages, so the sweep stays inside the language.
 */
async function clearListingAnchorsElsewhere({ scope, storage, keepPageId, widgets, lang }) {
  const claimed = new Set();
  for (const widget of Object.values(widgets || {})) {
    if (widget?.settings?.listing_anchor && widget.type) claimed.add(widget.type);
  }
  if (claimed.size === 0) return [];

  // Map the claimed widget types to the collections they list.
  const claimedCollections = new Set();
  for (const type of claimed) {
    const collectionType = (await readWidgetSchema(storage, scope, type))?.collection?.type;
    if (collectionType) claimedCollections.add(collectionType);
  }
  if (claimedCollections.size === 0) return [];

  const schemaCache = new Map();
  const collectionOf = async (type) => {
    if (!schemaCache.has(type)) {
      schemaCache.set(type, (await readWidgetSchema(storage, scope, type))?.collection?.type || null);
    }
    return schemaCache.get(type);
  };

  const cleared = [];
  const pageFiles = await listPageFiles(storage, scope, lang);
  for (const pageFile of pageFiles) {
    const pageId = pageFile.replace(/\.json$/, "");
    if (pageId === keepPageId) continue;

    const buf = await storage.read(scope, pageKey(pageId, lang));
    if (buf == null) continue;
    const page = JSON.parse(buf.toString("utf8"));

    let modified = false;
    for (const widget of Object.values(page.widgets || {})) {
      if (!(widget?.settings?.listing_anchor || widget?.settings?.paginate) || !widget.type) continue;
      const collectionType = await collectionOf(widget.type);
      if (!collectionType || !claimedCollections.has(collectionType)) continue;
      widget.settings.listing_anchor = false;
      widget.settings.paginate = false;
      modified = true;
    }

    if (modified) {
      await storage.write(scope, pageKey(pageId, lang), JSON.stringify(page, null, 2));
      cleared.push(page.name || pageId);
    }
  }
  return cleared;
}

/**
 * Duplicates an existing page with a new unique slug and copy suffix naming.
 * Preserves all page content including widgets and SEO settings.
 * @param {import('express').Request} req - Express request object with page ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function duplicatePage(req, res) {
  try {
    const originalPageId = req.params.id;
    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Read the original page data (missing original propagates to the 500 handler,
    // matching the pre-storage behavior of a failed filesystem read).
    const originalBuf = await storage.read(scope, pageKey(originalPageId, lang));
    if (originalBuf == null) {
      throw new Error(`Original page not found: ${originalPageId}`);
    }
    const originalPageData = JSON.parse(originalBuf.toString("utf8"));

    // Read all existing page files to find existing copy names
    const pageJsonFiles = await listPageFiles(storage, scope, lang);

    const existingPageNames = (
      await Promise.all(
        pageJsonFiles.map(async (name) => {
          try {
            const buf = await storage.read(scope, pageKey(name.replace(/\.json$/, ""), lang));
            return buf == null ? null : JSON.parse(buf.toString("utf8")).name;
          } catch {
            // Skip unreadable entries rather than failing the whole duplicate:
            // e.g. a directory named `*.json` (EISDIR) or a file removed in a
            // list/read race. Mirrors the old isFile() prefilter.
            return null;
          }
        }),
      )
    ).filter(Boolean);

    const newName = generateCopyName(originalPageData.name, existingPageNames);
    const newSlug = await generateUniqueSlug(newName, pageSlugTaken(storage, scope, lang));

    // A listing anchor belongs to one page per collection. Copying it would
    // leave two pages claiming the same collection, which the save-time sweep
    // never sees (a duplicate is written directly), so the tie-break would pick
    // by slug rather than by what the user meant. The copy starts unclaimed.
    const duplicatedWidgets = {};
    for (const [widgetId, widget] of Object.entries(originalPageData.widgets || {})) {
      duplicatedWidgets[widgetId] =
        widget?.settings?.listing_anchor === true || widget?.settings?.paginate === true
          ? { ...widget, settings: { ...widget.settings, listing_anchor: false, paginate: false } }
          : widget;
    }

    // A copy is a new page in its own translation group, not a translation of the original.
    const uuid = randomUUID();
    const newPage = {
      ...originalPageData,
      widgets: duplicatedWidgets,
      uuid,
      translationGroupId: uuid,
      language: lang.language,
      id: newSlug,
      name: newName,
      slug: newSlug,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await persistPageWithMediaTracking({
      scope,
      storage,
      pageId: newSlug,
      pageData: newPage,
      lang,
    });

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Error duplicating page:", error);
    res.status(500).json({ error: "Failed to duplicate page" });
  }
}
