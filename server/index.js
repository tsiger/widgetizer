import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

import { apiLimiter, editorApiLimiter } from "./middleware/rateLimiters.js";
import errorHandler from "./middleware/errorHandler.js";
import { THEMES_DIR, STATIC_DIST_DIR, STATIC_UTILS_DIR } from "./config.js";

// Load environment variables
dotenv.config();

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

const app = express();

// Trust proxy in production (required for rate limiting behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false, // Preview iframe needs inline styles/scripts from widgets
    crossOriginEmbedderPolicy: false, // Widgets load cross-origin iframes (YouTube, Maps, etc.)
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow SVGs and assets in preview iframe
  }),
);
app.use(express.json());

// Request logging removed

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

// Serve static files from the themes directory
// TODO: We use this only for the theme screenshot.png.
app.use("/themes", express.static(THEMES_DIR));

// iFrame runtime script (MUST be before production catch-all)
app.use("/runtime", express.static(STATIC_UTILS_DIR));

// --- Production-Only Logic ---
if (process.env.NODE_ENV === "production") {
  // Serve static assets from the dist/assets directory
  app.use("/assets", express.static(path.join(STATIC_DIST_DIR, "assets")));

  // Serve the static files from the React app
  app.use(express.static(STATIC_DIST_DIR));

  // Handles any requests that don't match the ones above
  app.get(/^\/(?!api|health).*/, (req, res) => {
    res.sendFile(path.join(STATIC_DIST_DIR, "index.html"));
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
