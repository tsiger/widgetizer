import express from "express";

import projectRoutes from "./routes/projects.js";
import themeRoutes from "./routes/themes.js";
import pagesRoutes from "./routes/pages.js";
import menusRoutes from "./routes/menus.js";
import mediaRoutes from "./routes/media.js";
import previewRoutes from "./routes/preview.js";
import exportRoutes from "./routes/export.js";
import widgetsRoutes from "./routes/widgets.js";
import iconsRoutes from "./routes/icons.js";
import collectionsRoutes from "./routes/collections.js";
import appSettingsRoutes from "./routes/appSettings.js";
import coreRoutes from "./routes/core.js";
import { renderPreviewToken } from "./controllers/previewController.js";
import { resolveActiveProject } from "./middleware/resolveActiveProject.js";
import { standardJsonParser } from "./middleware/jsonParser.js";

/**
 * The adapter keys every shell must supply. setupBuilderServer fails loudly when
 * any is missing — better a clear startup error than per-request 500s from
 * handlers destructuring `undefined`.
 */
const REQUIRED_ADAPTER_KEYS = ["scopeResolver", "previewScopeResolver", "storage", "assetStorage", "publish", "limits"];

function assertAdapters(adapters) {
  if (!adapters || typeof adapters !== "object") {
    throw new Error(`setupBuilderServer requires an adapters object with keys: ${REQUIRED_ADAPTER_KEYS.join(", ")}`);
  }
  const missing = REQUIRED_ADAPTER_KEYS.filter((key) => !adapters[key]);
  if (missing.length > 0) {
    throw new Error(`setupBuilderServer is missing required adapter(s): ${missing.join(", ")}`);
  }
}

/** Attach the adapter set to every request reaching this router. */
function attachAdapters(router, adapters) {
  router.use((req, _res, next) => {
    req.adapters = adapters;
    next();
  });
}

/**
 * The single dependency-injection point for assembling the builder backend.
 *
 * Validates the adapter set, then attaches it to every returned router so the
 * routers are self-sufficient wherever they are mounted — this is exactly what
 * hosted relies on when it mounts these routers (not createEditorApp) into its
 * own Express app. The injected `scopeResolver` is what `resolveActiveProject`
 * delegates to, so swapping adapters swaps tenancy behaviour with no route
 * changes.
 *
 * Returns three mountable routers so each shell can place them where it needs:
 *  - actorScopedRouter   — operations not tied to a selected project
 *                          (projects, theme library, app settings, core assets)
 *  - projectScopedRouter — operations on the active project's content
 *                          (pages, menus, media, preview, export)
 *  - previewRouter       — token-based preview render endpoint
 *
 * OSS mounts actor- and project-scoped routers both under `/api` (reproducing
 * today's URLs); hosted can mount the project-scoped router under
 * `/api/projects/:projectId`.
 *
 * The db connection is injected separately via `initDb({ getConnection })` —
 * that is the single, working connection seam, so setupBuilderServer takes no
 * `db` option.
 *
 * @param {{ adapters: object, plugins?: Array<object> }} options
 */
export function setupBuilderServer({ adapters, plugins = [] } = {}) {
  assertAdapters(adapters);

  const actorScopedRouter = express.Router();
  attachAdapters(actorScopedRouter, adapters);
  actorScopedRouter.use("/projects", projectRoutes);
  actorScopedRouter.use("/themes", themeRoutes);
  actorScopedRouter.use("/settings", appSettingsRoutes);
  actorScopedRouter.use("/core", coreRoutes);

  const projectScopedRouter = express.Router();
  attachAdapters(projectScopedRouter, adapters);
  projectScopedRouter.use("/pages", pagesRoutes);
  projectScopedRouter.use("/menus", menusRoutes);
  projectScopedRouter.use("/media", mediaRoutes);
  projectScopedRouter.use("/preview", previewRoutes);
  projectScopedRouter.use("/export", exportRoutes);
  projectScopedRouter.use("/widgets", widgetsRoutes);
  projectScopedRouter.use("/icons", iconsRoutes);
  projectScopedRouter.use("/collections", collectionsRoutes);

  // Backend plugins may contribute additional project-scoped routes. They get
  // the SAME pipeline as built-in project routes — JSON parsing and scope
  // resolution — so a plugin handler runs with a parsed req.body and a resolved
  // req.scope. Without this a plugin route would bypass scope resolution
  // (a multi-tenancy hole in hosted).
  for (const plugin of plugins) {
    for (const route of plugin.projectScopedRoutes ?? []) {
      projectScopedRouter[route.method.toLowerCase()](route.path, standardJsonParser, resolveActiveProject, route.handler);
    }
  }

  const previewRouter = express.Router();
  attachAdapters(previewRouter, adapters);
  previewRouter.get("/render/:token", renderPreviewToken);

  return { actorScopedRouter, projectScopedRouter, previewRouter };
}
