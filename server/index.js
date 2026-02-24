// Load .env FIRST — must be before any module that reads process.env
import "./env.js";

import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";

import { apiLimiter, editorApiLimiter } from "./middleware/rateLimiters.js";
import authMiddleware from "./middleware/auth.js";
import errorHandler from "./middleware/errorHandler.js";
import { HOSTED_MODE } from "./hostedMode.js";
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

const app = express();

// Trust proxy in production (required for rate limiting behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// CORS: use allowlist when preview isolation is enabled, permissive otherwise
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
// JSON body parsing is applied per-router (not globally) so that the page
// content save route can use a higher limit. See middleware/jsonParser.js.

// Auth: always sets req.userId ("local" in open-source, Clerk ID in hosted)
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
if (HOSTED_MODE) {
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

// --- Production-Only Logic ---
if (process.env.NODE_ENV === "production") {
  // Serve static assets from the dist/assets directory
  app.use("/assets", express.static(path.join(STATIC_DIST_DIR, "assets")));

  // Serve the static files from the React app
  app.use(express.static(STATIC_DIST_DIR));

  // Handles any requests that don't match the ones above
  app.get(/^\/(?!api|health|render).*/, (req, res) => {
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
