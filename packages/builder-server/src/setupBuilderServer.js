import express from "express";

import projectRoutes from "./routes/projects.js";
import themeRoutes from "./routes/themes.js";
import pagesRoutes from "./routes/pages.js";
import menusRoutes from "./routes/menus.js";
import mediaRoutes from "./routes/media.js";
import previewRoutes from "./routes/preview.js";
import exportRoutes from "./routes/export.js";
import appSettingsRoutes from "./routes/appSettings.js";
import coreRoutes from "./routes/core.js";
import { renderPreviewToken } from "./controllers/previewController.js";

/**
 * The single dependency-injection point for assembling the builder backend.
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
 * `/api/projects/:projectId`. Handlers and their resolveActiveProject middleware
 * are unchanged here — request scope resolution is migrated separately.
 *
 * @param {{ adapters?: object, db?: unknown, plugins?: Array<object> }} options
 */
export function setupBuilderServer({ adapters: _adapters, db: _db, plugins = [] } = {}) {
  const actorScopedRouter = express.Router();
  actorScopedRouter.use("/projects", projectRoutes);
  actorScopedRouter.use("/themes", themeRoutes);
  actorScopedRouter.use("/settings", appSettingsRoutes);
  actorScopedRouter.use("/core", coreRoutes);

  const projectScopedRouter = express.Router();
  projectScopedRouter.use("/pages", pagesRoutes);
  projectScopedRouter.use("/menus", menusRoutes);
  projectScopedRouter.use("/media", mediaRoutes);
  projectScopedRouter.use("/preview", previewRoutes);
  projectScopedRouter.use("/export", exportRoutes);

  // Backend plugins may contribute additional project-scoped routes.
  for (const plugin of plugins) {
    for (const route of plugin.projectScopedRoutes ?? []) {
      projectScopedRouter[route.method.toLowerCase()](route.path, route.handler);
    }
  }

  const previewRouter = express.Router();
  previewRouter.get("/render/:token", renderPreviewToken);

  return { actorScopedRouter, projectScopedRouter, previewRouter };
}
