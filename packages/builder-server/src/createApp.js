import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";

import errorHandler from "./middleware/errorHandler.js";
import { getThemesDir, STATIC_DIST_DIR, STATIC_UTILS_DIR } from "./config.js";

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

function mountEditorApiRoutes(app) {
  // JSON body parsing is applied per-router (not globally) so that the page
  // content save route can use a higher limit. See middleware/jsonParser.js.

  app.use("/api/projects", projectRoutes);
  app.use("/api/themes", themeRoutes);
  app.use("/api/pages", pagesRoutes);
  app.use("/api/preview", previewRoutes);
  app.use("/api/menus", menusRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/settings", appSettingsRoutes);
app.use("/api/core", coreRoutes);

  // Serve theme assets (screenshots) from themes directory
  app.use("/themes", express.static(getThemesDir()));

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
 * Create and configure an Express app for the Widgetizer editor.
 *
 * @returns {Promise<import('express').Express>} Configured Express app (call .listen() yourself)
 */
export async function createEditorApp() {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  applySharedMiddleware(app);
  mountEditorApiRoutes(app);
  mountEditorUiRoutes(app);
  app.use(errorHandler);

  return app;
}
