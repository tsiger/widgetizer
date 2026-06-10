// Thin OSS-shell adapter over the pure @widgetizer/render-engine.
//
// The engine takes a resolved per-project `deps` bag and never resolves
// projects, touches SQLite, or constructs absolute data paths itself. This
// wrapper preserves the historical `(projectId, ...)` call signatures used
// throughout the OSS controllers and tests: it resolves the project's folder
// (the project-resolution error boundary lives here, matching pre-carve-out
// behavior), builds the deps bag from config + repos + services, and delegates.
import {
  renderWidget as engineRenderWidget,
  renderPageLayout as engineRenderPageLayout,
  renderEnqueuedAssetTags,
  widgetSupportsTransparentHeader as engineWidgetSupportsTransparentHeader,
} from "@widgetizer/render-engine";

import { getProjectDir, CORE_WIDGETS_DIR, CORE_SNIPPETS_DIR } from "../config.js";
import { readMediaFile } from "./mediaService.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { listProjectPagesData } from "../controllers/pageController.js";
import { preprocessThemeSettings } from "../utils/themeHelpers.js";
import { buildRuntimeSiteIcons } from "../utils/siteIconHelpers.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { sanitizeWidgetData } from "./sanitizationService.js";

/**
 * Resolve a projectId into the engine's per-project deps bag.
 * Throws project-resolution errors (via getProjectFolderName) before the engine
 * runs — preserving the boundary callers rely on to map to 404s.
 * @param {string} projectId
 * @returns {Promise<import("@widgetizer/render-engine").RenderDeps>}
 */
async function buildRenderDeps(projectId) {
  const folderName = await getProjectFolderName(projectId);
  return {
    projectId,
    projectDir: getProjectDir(folderName),
    coreWidgetsDir: CORE_WIDGETS_DIR,
    coreSnippetsDir: CORE_SNIPPETS_DIR,
    getProjectData: () => projectRepo.getProjectById(projectId) || null,
    getMediaFiles: () => readMediaFile(projectId),
    listPages: () => listProjectPagesData(folderName),
    sanitizeWidgetData,
    preprocessThemeSettings,
    buildRuntimeSiteIcons,
  };
}

async function renderWidget(
  projectId,
  widgetId,
  widgetData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
  index = null,
) {
  const deps = await buildRenderDeps(projectId);
  return engineRenderWidget(deps, widgetId, widgetData, rawThemeSettings, renderMode, sharedGlobals, index);
}

async function renderPageLayout(
  projectId,
  contentSections,
  pageData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
) {
  const deps = await buildRenderDeps(projectId);
  return engineRenderPageLayout(deps, contentSections, pageData, rawThemeSettings, renderMode, sharedGlobals);
}

async function widgetSupportsTransparentHeader(projectId, widgetType) {
  try {
    const deps = await buildRenderDeps(projectId);
    return engineWidgetSupportsTransparentHeader(deps, widgetType);
  } catch {
    // Unknown/unresolvable project — preserve the original swallow-and-false.
    return false;
  }
}

export { renderWidget, renderPageLayout, renderEnqueuedAssetTags, widgetSupportsTransparentHeader };
