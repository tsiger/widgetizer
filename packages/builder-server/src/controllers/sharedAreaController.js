import { LIMIT_KEYS, MAX_WIDGETS_PER_PAGE } from "@widgetizer/core/adapters";
import { areaKey } from "@widgetizer/core/contentAddress";
import { requestLanguage } from "../utils/contentLanguage.js";
import { isProjectResolutionError } from "../utils/projectErrors.js";
import { updateAreaMediaUsage, extractMediaPathsFromArea } from "../services/mediaUsageService.js";
import {
  withContentWriteLock,
  assertIntroducedMediaExists,
  assertLanguageStillEnabled,
} from "../services/contentCoordination.js";
import { listAreas, readArea, readDeclaredAreas, areaSaveProblem } from "../services/sharedAreaService.js";

function sendError(res, error, fallback) {
  if (error?.code === "LANGUAGE_REMOVED") {
    return res
      .status(error.statusCode)
      .json({ error: "Language removed", message: error.message, code: error.code, language: error.language });
  }
  if (error?.code === "MEDIA_REFERENCE_MISSING") {
    return res.status(error.statusCode).json({ error: "Missing media", message: error.message, code: error.code });
  }
  if (error?.code === "AREA_UNREADABLE") {
    return res.status(error.statusCode).json({ error: fallback, message: error.message, code: error.code });
  }
  if (isProjectResolutionError(error)) {
    return res.status(404).json({ error: "Project not found", message: error.message });
  }
  console.error(`${fallback}:`, error);
  return res.status(500).json({ error: fallback });
}

/**
 * GET /api/shared-areas?language= — the language's areas: the ones the theme
 * declares, the ones it no longer shows, and the content of each.
 */
export async function getSharedAreas(req, res) {
  try {
    const lang = requestLanguage(req, res);
    if (!lang) return;
    res.json(await listAreas(req.adapters.storage, req.scope, lang));
  } catch (error) {
    sendError(res, error, "Failed to load shared areas");
  }
}

/**
 * PUT /api/shared-areas/:id — save one area of one language. Only an area the theme
 * declares can be saved; a retained one is kept as it is until the theme shows it again.
 */
export async function saveSharedArea(req, res) {
  try {
    const { id } = req.params;
    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    const declared = await readDeclaredAreas(storage, scope);
    if (!declared.some((area) => area.id === id)) {
      return res.status(404).json({ error: `The theme has no shared area "${id}".`, code: "AREA_NOT_DECLARED" });
    }

    const widgetCap = await req.adapters?.limits?.getLimit?.(scope, LIMIT_KEYS.MAX_WIDGETS_PER_PAGE);
    const maxWidgets = typeof widgetCap === "number" && widgetCap > 0 ? widgetCap : MAX_WIDGETS_PER_PAGE;
    const problem = areaSaveProblem(req.body, maxWidgets);
    if (problem) return res.status(problem.status).json({ error: problem.message });

    const area = { widgets: req.body.widgets, widgetsOrder: req.body.widgetsOrder };

    // The write and its usage sync are one media section, like a page save: media
    // deletion verifies and deletes in the same section, so it cannot run between them.
    const { usageStale } = await withContentWriteLock(scope.projectId, async () => {
      assertLanguageStillEnabled(scope.projectId, lang);

      // Read inside the section. An unreadable file throws here rather than being
      // treated as empty and overwritten.
      const previous = await readArea(storage, scope, id, lang);
      await assertIntroducedMediaExists({
        assetStorage: req.adapters.assetStorage,
        scope,
        previousPaths: extractMediaPathsFromArea(previous),
        nextPaths: extractMediaPathsFromArea(area),
      });

      await storage.write(scope, areaKey(id, lang), JSON.stringify(area, null, 2));

      try {
        await updateAreaMediaUsage(scope.projectId, id, area, lang);
        return { usageStale: false };
      } catch (usageError) {
        // The area IS saved; only the derived usage rows are behind.
        console.warn(`Failed to update media usage for shared area ${id}:`, usageError);
        return { usageStale: true };
      }
    });

    res.json({
      success: true,
      data: area,
      ...(usageStale ? { warnings: [{ code: "MEDIA_USAGE_STALE", path: `area:${id}` }] } : {}),
    });
  } catch (error) {
    sendError(res, error, "Failed to save shared area");
  }
}
