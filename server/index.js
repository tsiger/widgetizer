import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import cors from "cors";

import { apiLimiter, editorApiLimiter } from "./middleware/rateLimiters.js";
import errorHandler from "./middleware/errorHandler.js";

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Trust proxy in production (required for rate limiting behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cors());
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
app.use("/themes", express.static(path.join(__dirname, "../themes")));

// iFrame runtime script (MUST be before production catch-all)
app.use("/runtime", express.static(path.join(__dirname, "../src/utils")));

// --- Production-Only Logic ---
if (process.env.NODE_ENV === "production") {
  // Serve static assets from the dist/assets directory
  app.use("/assets", express.static(path.join(__dirname, "../dist/assets")));

  // Serve the static files from the React app
  app.use(express.static(path.join(__dirname, "../dist")));

  // Handles any requests that don't match the ones above
  app.get(/^\/(?!api|health).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
