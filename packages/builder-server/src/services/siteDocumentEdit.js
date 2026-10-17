import { NotFoundError, LimitExceededError, WidgetizerError } from "@widgetizer/core/errors";
import { LIMIT_KEYS, MAX_WIDGETS_PER_PAGE } from "@widgetizer/core/adapters";
import { pageKey, globalKey } from "@widgetizer/core/contentAddress";
import { withContentWriteLock, assertLanguageStillEnabled } from "./contentCoordination.js";
import { persistPageInSection, enforcePaginationRules, clearListingAnchorsElsewhere } from "../controllers/pageController.js";
import { persistGlobalInSection } from "../controllers/previewController.js";

/**
 * Change one saved page, header or footer through the editor's own save path, in one
 * content-write section: `update` gets the saved document as it is now and returns the
 * next one, or throws to leave it untouched.
 *
 * @param {{
 *   storage: object, assetStorage: object, limits?: object, scope: object, lang: object,
 *   target: { kind: "page", slug: string } | { kind: "global", type: "header"|"footer" },
 *   update: (current: object) => Promise<object>,
 *   beforeWrite?: () => void | Promise<void>,
 * }} args - `beforeWrite` runs once every check has passed, right before the file is written.
 * @returns {Promise<{ document: object, usageStale: boolean, listingMovedFrom?: string[] }>}
 */
export function editSiteDocument({ storage, assetStorage, limits, scope, lang, target, update, beforeWrite }) {
  const key = target.kind === "page" ? pageKey(target.slug, lang) : globalKey(target.type, lang);
  return withContentWriteLock(scope.projectId, async () => {
    assertLanguageStillEnabled(scope.projectId, lang);
    const saved = await storage.read(scope, key);
    if (saved == null) throw new NotFoundError("That page, header or footer doesn't exist.", { code: "TARGET_NOT_FOUND" });
    const current = JSON.parse(saved.toString("utf8"));
    const next = await update(current);

    if (target.kind === "global") {
      const { usageStale } = await persistGlobalInSection({ scope, storage, assetStorage, type: target.type, widgetData: next, lang, beforeWrite });
      return { document: next, usageStale };
    }

    const cap = await limits?.getLimit?.(scope, LIMIT_KEYS.MAX_WIDGETS_PER_PAGE);
    const maxWidgets = typeof cap === "number" && cap > 0 ? cap : MAX_WIDGETS_PER_PAGE;
    const count = Math.max(next.widgetsOrder?.length ?? 0, Object.keys(next.widgets ?? {}).length);
    if (Number.isFinite(maxWidgets) && count > maxWidgets) {
      throw new LimitExceededError(`Too many sections on this page (${count}); the maximum is ${maxWidgets}.`, { code: "TOO_MANY_SECTIONS" });
    }
    const paginationError = await enforcePaginationRules({ scope, storage, widgets: next.widgets });
    if (paginationError) throw new WidgetizerError(paginationError, { statusCode: 422, code: "PAGINATION_INVALID" });
    const pageData = { ...next, id: current.slug ?? target.slug, slug: current.slug ?? target.slug, updated: new Date().toISOString() };
    const { usageStale } = await persistPageInSection({
      scope,
      storage,
      pageId: target.slug,
      pageData,
      previousPageId: target.slug,
      lang,
      assetStorage,
      beforeWrite,
    });
    // One listing anchor per collection, as the editor's save keeps it.
    const listingMovedFrom = await clearListingAnchorsElsewhere({ scope, storage, keepPageId: target.slug, widgets: pageData.widgets, lang });
    return { document: pageData, usageStale, listingMovedFrom };
  });
}
