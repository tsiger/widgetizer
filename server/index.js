import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import { apiLimiter, editorApiLimiter } from "./middleware/rateLimiters.js";
import requestLogger from "./middleware/requestLogger.js";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet());

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = isProduction ? [process.env.PRODUCTION_URL] : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  }),
);

app.use(express.json());

// Log all api requests
app.use("/api", requestLogger);

// Remove the global rate limiter
// app.use("/api", apiLimiter);

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

// Serve static files from the themes directory
app.use("/themes", express.static(path.join(__dirname, "../themes")));

// iFrame runtime script
app.use("/runtime", express.static(path.join(__dirname, "../src/utils")));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
