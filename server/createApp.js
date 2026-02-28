import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";

import { apiLimiter, editorApiLimiter } from "./middleware/rateLimiters.js";
import authMiddleware from "./middleware/auth.js";
import errorHandler from "./middleware/errorHandler.js";
import { getUserThemesDir, STATIC_DIST_DIR, STATIC_UTILS_DIR } from "./config.js";

import projectRoutes from "./routes/projects.js";
import themeRoutes from "./routes/themes.js";
import pagesRoutes from "./routes/pages.js";
import menusRoutes from "./routes/menus.js";
import mediaRoutes from "./routes/media.js";
import previewRoutes from "./routes/preview.js";
import exportRoutes from "./routes/export.js";
import appSettingsRoutes from "./routes/appSettings.js";
import coreWidgetsRoutes from "./routes/coreWidgets.js";
import coreRoutes from "./routes/core.js";
import { renderPreviewToken } from "./controllers/previewController.js";

import { resolveAdapters } from "./adapters/index.js";

function applyAppLocals(app, hostedMode, adapters) {
  app.locals.adapters = adapters;
  app.locals.hostedMode = hostedMode;

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
}

function applySharedMiddleware(app) {
  if (process.env.PREVIEW_ISOLATION === "true" && process.env.ALLOWED_ORIGINS) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
      }),
    );
  } else {
    app.use(cors());
  }

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

async function mountEditorApiRoutes(app, hostedMode) {
  // JSON body parsing is applied per-router (not globally) so that the page
  // content save route can use a higher limit. See middleware/jsonParser.js.

  // Auth: always sets req.userId ("local" in open-source, platform user ID in hosted)
  app.use("/api", authMiddleware);

  // Apply lenient rate limiting for editor-heavy routes
  app.use("/api/projects", editorApiLimiter, projectRoutes);
  app.use("/api/themes", editorApiLimiter, themeRoutes);
  app.use("/api/pages", editorApiLimiter, pagesRoutes);
  app.use("/api/preview", editorApiLimiter, previewRoutes);

  // Apply stricter rate limiting for other routes
  app.use("/api/menus", apiLimiter, menusRoutes);
  app.use("/api/media", apiLimiter, mediaRoutes);
  app.use("/api/export", apiLimiter, exportRoutes);
  app.use("/api/settings", apiLimiter, appSettingsRoutes);
  app.use("/api/core-widgets", apiLimiter, coreWidgetsRoutes);
  app.use("/api/core", apiLimiter, coreRoutes);

  // Hosted-only: publish routes (provided at deploy time, not in open-source repo)
  if (hostedMode) {
    try {
      const publishRoutes = (await import("./routes/publish.js")).default;
      app.use("/api/publish", apiLimiter, publishRoutes);
    } catch (err) {
      console.log("Publish routes not available (hosted-only feature):", err.message);
    }
  }

  // Serve theme assets (screenshots) from user-scoped themes directory
  app.use("/themes", authMiddleware, (req, res, next) => {
    express.static(getUserThemesDir(req.userId))(req, res, next);
  });

  // iFrame runtime script (MUST be before production catch-all)
  app.use("/runtime", express.static(STATIC_UTILS_DIR));

  // Token-based preview rendering (MUST be before production catch-all)
  app.get("/render/:token", renderPreviewToken);

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
 * Create the API/support surface for the Widgetizer editor.
 *
 * Includes the editor APIs and support endpoints that must stay rooted at `/`.
 *
 * @param {object} [options]
 * @param {boolean} [options.hostedMode=false]
 * @param {object} [options.adapters]
 * @returns {Promise<import('express').Express>}
 */
export async function createEditorApiApp(options = {}) {
  const hostedMode = options.hostedMode ?? false;
  const adapters = resolveAdapters(options.adapters);

  const app = express();
  applyAppLocals(app, hostedMode, adapters);
  applySharedMiddleware(app);
  await mountEditorApiRoutes(app, hostedMode);
  return app;
}

/**
 * Create the UI-only surface for the Widgetizer editor.
 *
 * Includes only static asset serving + the SPA catch-all.
 *
 * @param {object} [options]
 * @param {boolean} [options.hostedMode=false]
 * @param {object} [options.adapters]
 * @returns {Promise<import('express').Express>}
 */
export async function createEditorUiApp(options = {}) {
  const hostedMode = options.hostedMode ?? false;
  const adapters = resolveAdapters(options.adapters);

  const app = express();
  applyAppLocals(app, hostedMode, adapters);
  mountEditorUiRoutes(app);
  return app;
}

/**
 * Create and configure an Express app for the Widgetizer editor.
 *
 * @param {object} [options]
 * @param {boolean} [options.hostedMode=false] - Whether to run in hosted mode
 * @param {object} [options.adapters] - Adapter overrides (partial overrides supported)
 * @returns {Promise<import('express').Express>} Configured Express app (call .listen() yourself)
 */
export async function createEditorApp(options = {}) {
  const app = express();
  const apiApp = await createEditorApiApp(options);
  const uiApp = await createEditorUiApp(options);

  app.use(apiApp);
  app.use(uiApp);

  app.use(errorHandler);

  return app;
}
