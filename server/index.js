import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

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

app.use(cors());
app.use(express.json());

app.use("/api/projects", projectRoutes);
app.use("/api/themes", themeRoutes);
app.use("/api/pages", pagesRoutes);
app.use("/api/menus", menusRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/preview", previewRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/settings", appSettingsRoutes);
app.use("/api/core-widgets", coreWidgetsRoutes);

// Serve static files from the themes directory
app.use("/themes", express.static(path.join(__dirname, "../themes")));

// iFrame runtime script
app.use("/runtime", express.static(path.join(__dirname, "../src/utils")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
