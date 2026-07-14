import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";

import errorHandler from "./middleware/errorHandler.js";
import { getThemesDir, STATIC_DIST_DIR, STATIC_PREVIEW_RUNTIME_DIR } from "./config.js";
import { getThemeSourceDir } from "./controllers/themeController.js";
import { setupBuilderServer } from "./setupBuilderServer.js";

function applySharedMiddleware(app) {
  app.use(cors());

  app.use(
    helmet({
      contentSecurityPolicy: false, // Preview iframe needs inline styles/scripts from widgets
      crossOriginEmbedderPolicy: false, // Widgets load cross-origin iframes (YouTube, Maps, etc.)
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow SVGs and assets in preview iframe
      frameguard: false, // Preview renders in iframe via /render/:token
      referrerPolicy: { policy: "strict-origin-when-cross-origin" }, // YouTube/Vimeo need Referer header to validate embeds
      crossOriginOpenerPolicy: false, // YouTube player needs cross-origin popup communication
    }),
  );
}

function mountEditorApiRoutes(app, { adapters, plugins } = {}) {
  // JSON body parsing is applied per-router (not globally) so that the page
  // content save route can use a higher limit. See middleware/jsonParser.js.
  const { actorScopedRouter, projectScopedRouter, previewRouter } = setupBuilderServer({
    adapters,
    plugins,
  });

  // OSS mounts both scoped routers under /api, reproducing today's URLs
  // (/api/projects, /api/pages, ...).
  app.use("/api", actorScopedRouter);
  app.use("/api", projectScopedRouter);

  // Serve theme assets (screenshots) from each theme's SOURCE dir, not the
  // themes root: once a theme update is applied the live files move to
  // latest/, so the root copy's screenshot goes stale and presets delivered
  // via an update exist ONLY in latest/ (their screenshot would 404). Resolve
  // per request (getThemeSourceDir caches, and invalidates on update) and
  // delegate to a per-dir static handler with the theme segment stripped.
  const themeStaticByDir = new Map();
  app.use("/themes", async (req, res, next) => {
    const themeId = req.path.split("/")[1];
    // Strict allowlist: also keeps ".." out of the path we resolve.
    if (!themeId || !/^[a-zA-Z0-9_-]+$/.test(themeId)) return next();
    let sourceDir;
    try {
      sourceDir = await getThemeSourceDir(themeId);
    } catch {
      return next();
    }
    let handler = themeStaticByDir.get(sourceDir);
    if (!handler) {
      handler = express.static(sourceDir);
      themeStaticByDir.set(sourceDir, handler);
    }
    // Strip the theme segment for the per-dir handler; restore on miss so the
    // rest of the chain (root fallback, SPA catch-all) sees the original URL.
    const originalUrl = req.url;
    req.url = req.url.slice(`/${themeId}`.length) || "/";
    handler(req, res, (err) => {
      req.url = originalUrl;
      next(err);
    });
  });
  // Fallback for ids the allowlist rejects: previous root-static behavior.
  app.use("/themes", express.static(getThemesDir()));

  // iFrame runtime script (MUST be before production catch-all)
  app.use("/runtime", express.static(STATIC_PREVIEW_RUNTIME_DIR));

  // Token-based preview rendering (MUST be before production catch-all)
  app.use("/", previewRouter);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
}

function mountEditorUiRoutes(app) {
  // Serve static assets from the dist/assets directory
  app.use("/assets", express.static(path.join(STATIC_DIST_DIR, "assets")));

  // Serve the static files from the React app
  app.use(express.static(STATIC_DIST_DIR));

  // Handles any requests that don't match the ones above
  app.get(/^\/(?!api|health|render).*/, (req, res) => {
    res.sendFile(path.join(STATIC_DIST_DIR, "index.html"));
  });
}

/**
 * Create and configure an Express app for the Widgetizer editor.
 *
 * @param {{ adapters: object, plugins?: Array<object> }} options - `adapters` is
 *   the REQUIRED adapter set (scopeResolver, previewScopeResolver, storage,
 *   assetStorage, publish, limits) constructed by the shell. Handlers
 *   unconditionally read `req.adapters`; setupBuilderServer validates the set and
 *   attaches it per-router. Passing none (or an incomplete set) throws.
 * @returns {Promise<import('express').Express>} Configured Express app (call .listen() yourself)
 */
export async function createEditorApp({ adapters, plugins = [] } = {}) {
  if (!adapters) {
    throw new Error("createEditorApp requires an adapters set; pass the shell's adapters (see setupBuilderServer)");
  }

  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  applySharedMiddleware(app);

  // req.adapters is attached per-router inside setupBuilderServer (so the routers
  // are self-sufficient wherever mounted), not app-wide here.
  mountEditorApiRoutes(app, { adapters, plugins });
  mountEditorUiRoutes(app);
  app.use(errorHandler);

  return app;
}
