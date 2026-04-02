import { app, BrowserWindow, dialog, ipcMain, Menu, shell, utilityProcess } from "electron";
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

// Constants
const DEFAULT_PORT = "3001";
const SERVER_STARTUP_TIMEOUT_MS = 30000;
const SERVER_POLL_INTERVAL_MS = 500;
const DOCS_URL = "https://docs.widgetizer.org";

// State
let mainWindow = null;
let previewWindow = null;
let serverProcess = null;
let logFile = null;

// Paths - computed after app is ready
let appRoot = null; // Path to app.asar (for Electron-loaded resources)
let unpackedRoot = null; // Path to app.asar.unpacked (for Node.js server resources)
let resourcesPath = null;
let userDataPath = null;
let dataRoot = null;
let themesRoot = null;
let logsDir = null;

const serverPort = process.env.PORT || DEFAULT_PORT;

// Determine if we're in development mode
function getIsDev() {
  // Check environment variable first (set by electron:dev script)
  if (process.env.ELECTRON_DEV === "1") {
    return true;
  }
  // In packaged apps, app.isPackaged is true
  return !app.isPackaged;
}

// Initialize paths after app is ready
function initPaths() {
  const isDev = getIsDev();

  if (isDev) {
    // Development: use project root for everything
    appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    unpackedRoot = appRoot;
    resourcesPath = appRoot;
  } else {
    // Production: app is packaged (asar enabled)
    // app.getAppPath() returns path to app.asar (or app/ if asar disabled)
    appRoot = app.getAppPath();
    resourcesPath = path.dirname(appRoot);
    if (appRoot.endsWith(".asar")) {
      // Unpacked files live alongside app.asar in app.asar.unpacked
      unpackedRoot = path.join(resourcesPath, "app.asar.unpacked");
    } else {
      // Asar disabled
      unpackedRoot = appRoot;
    }
  }

  userDataPath = app.getPath("userData");
  dataRoot = path.join(userDataPath, "data");
  // Themes need to be readable as real directories for fs.cp
  if (!isDev && appRoot.endsWith(".asar")) {
    themesRoot = path.join(unpackedRoot, "themes");
  } else {
    themesRoot = path.join(appRoot, "themes");
  }
  logsDir = path.join(userDataPath, "logs");

  log(`Paths initialized:`);
  log(`  isDev: ${isDev}`);
  log(`  appRoot: ${appRoot}`);
  log(`  unpackedRoot: ${unpackedRoot}`);
  log(`  resourcesPath: ${resourcesPath}`);
  log(`  userDataPath: ${userDataPath}`);
  log(`  dataRoot: ${dataRoot}`);
  log(`  themesRoot: ${themesRoot}`);
  log(`  logsDir: ${logsDir}`);
}

// Logging - console always works, file logging after app ready
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  if (logFile) {
    try {
      logFile.write(line + "\n");
    } catch (err) {
      console.error("Failed to write to log file:", err);
    }
  }
}

function getUpdaterOverrideUrl() {
  const envUrl = process.env.ELECTRON_UPDATER_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  const arg = process.argv.find((value) => value.startsWith("--updater-url="));
  if (!arg) {
    return null;
  }

  return arg.slice("--updater-url=".length).trim() || null;
}

function normalizeUpdaterUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function initLogging() {
  try {
    const logsPath = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(logsPath, { recursive: true });
    logFile = fs.createWriteStream(path.join(logsPath, "widgetizer.log"), { flags: "a" });
    log("=".repeat(60));
    log(`Widgetizer starting at ${new Date().toISOString()}`);
    log(`Electron version: ${process.versions.electron}`);
    log(`Node version: ${process.versions.node}`);
    log(`Platform: ${process.platform} ${process.arch}`);
    log(`app.isPackaged: ${app.isPackaged}`);
    log(`process.execPath: ${process.execPath}`);
    log(`__dirname equivalent: ${path.dirname(fileURLToPath(import.meta.url))}`);
  } catch (err) {
    console.error("Failed to init logging:", err);
  }
}

// Ensure user data directories exist
function ensureDataDirectories() {
  try {
    fs.mkdirSync(path.join(dataRoot, "projects"), { recursive: true });
    log(`Data directory created/verified: ${dataRoot}`);
  } catch (err) {
    log(`Error creating data directory: ${err.message}`);
  }
}

// Start the Express server as a utility process.
// utilityProcess.fork() runs with full Electron asar support, unlike spawn with ELECTRON_RUN_AS_NODE
// which strips asar patching and causes fs operations on asar-internal paths to fail on Windows.
function startServer() {
  if (process.env.ELECTRON_DISABLE_INTERNAL_SERVER === "1") {
    log("Internal server disabled by environment variable");
    return;
  }

  const isDev = getIsDev();
  // Server files live inside app.asar
  const serverEntry = path.join(appRoot, "server", "index.js");

  log(`Starting server from: ${serverEntry}`);
  log(`Server will use DATA_ROOT: ${dataRoot}`);
  log(`Server will use THEMES_ROOT: ${themesRoot}`);
  log(`Server will use APP_ROOT: ${appRoot}`);
  log(`Server will use UNPACKED_ROOT: ${unpackedRoot}`);

  // Verify server entry exists
  try {
    if (fs.existsSync(serverEntry)) {
      log(`Server entry verified: ${serverEntry}`);
    } else {
      log(`WARNING: Server entry not found at ${serverEntry}`);
    }
  } catch (err) {
    log(`Warning checking server entry: ${err.message}`);
  }

  const env = {
    ...process.env,
    NODE_ENV: isDev ? "development" : "production",
    PORT: serverPort,
    DATA_ROOT: dataRoot,
    THEMES_ROOT: themesRoot,
    APP_ROOT: appRoot,
    UNPACKED_ROOT: unpackedRoot,
  };

  try {
    serverProcess = utilityProcess.fork(serverEntry, [], {
      cwd: userDataPath,
      env,
      stdio: "pipe",
    });

    serverProcess.stdout.on("data", (data) => {
      log(`[server stdout] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on("data", (data) => {
      log(`[server stderr] ${data.toString().trim()}`);
    });

    serverProcess.on("exit", (code) => {
      log(`Server process exited with code ${code}`);
      serverProcess = null;
    });

    // PID is available after the 'spawn' event fires
    serverProcess.on("spawn", () => {
      log(`Server process spawned with PID: ${serverProcess.pid}`);
    });
  } catch (err) {
    log(`Failed to spawn server process: ${err.message}`);
  }
}

// Stop the server
function stopServer() {
  if (serverProcess) {
    log("Stopping server process...");
    serverProcess.kill();
    serverProcess = null;
  }
}

// Wait for server to be ready
function waitForServerReady() {
  if (process.env.ELECTRON_DISABLE_INTERNAL_SERVER === "1") {
    return Promise.resolve();
  }

  log(`Waiting for server to be ready on port ${serverPort}...`);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > SERVER_STARTUP_TIMEOUT_MS) {
        log(`Server startup timed out after ${elapsed}ms`);
        reject(new Error("Server startup timed out"));
        return;
      }

      const req = http.get(
        {
          hostname: "127.0.0.1",
          port: parseInt(serverPort, 10),
          path: "/health",
          timeout: SERVER_POLL_INTERVAL_MS,
        },
        (res) => {
          res.resume();
          if (res.statusCode === 200) {
            log(`Server ready after ${elapsed}ms`);
            resolve();
          } else {
            log(`Server returned status ${res.statusCode}, retrying...`);
            setTimeout(check, SERVER_POLL_INTERVAL_MS);
          }
        },
      );

      req.on("error", () => {
        // Server not ready yet, retry
        setTimeout(check, SERVER_POLL_INTERVAL_MS);
      });

      req.on("timeout", () => {
        req.destroy();
        setTimeout(check, SERVER_POLL_INTERVAL_MS);
      });
    };

    check();
  });
}

function getRendererBaseUrl() {
  if (getIsDev()) {
    return process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  }

  return `http://127.0.0.1:${serverPort}`;
}

function getRendererUrl(routePath = "/") {
  const normalizedRoute = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return new URL(normalizedRoute, `${getRendererBaseUrl().replace(/\/$/, "")}/`).toString();
}

// Create the main browser window
function createWindow() {
  log("Creating main window...");

  const preloadPath = path.join(appRoot, "electron", "preload.js");

  log(`Preload path: ${preloadPath}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false, // Don't show until ready
    backgroundColor: "#1a1a2e", // Match app background for smoother load
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  mainWindow.on("closed", () => {
    log("Main window closed");
    mainWindow = null;
  });

  mainWindow.on("ready-to-show", () => {
    log("Window ready to show");
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle load failures
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    log(`Page failed to load: ${errorDescription} (${errorCode}) - URL: ${validatedURL}`);
  });

  // Handle unresponsive renderer — offer to wait or force-reload
  mainWindow.on("unresponsive", () => {
    log("Window became unresponsive");
    dialog
      .showMessageBox(mainWindow, {
        type: "warning",
        title: "Widgetizer is not responding",
        message: "The application is not responding. Would you like to reload it?",
        buttons: ["Wait", "Reload"],
        defaultId: 1,
        cancelId: 0,
      })
      .then(({ response }) => {
        if (response === 1 && mainWindow) {
          log("User chose to reload unresponsive window");
          mainWindow.webContents.reload();
        }
      });
  });

  mainWindow.on("responsive", () => {
    log("Window became responsive again");
  });

  // Handle renderer process crash — reload or show error page
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    log(`Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (details.reason === "clean-exit") return;
      showError(
        `The renderer process crashed unexpectedly.\n\n` +
          `Reason: ${details.reason}\n` +
          `Exit code: ${details.exitCode}\n\n` +
          `Click Retry to reload the application.`,
      );
    }
  });

  // Don't let a stuck beforeunload handler prevent window close
  mainWindow.webContents.on("will-prevent-unload", (event) => {
    log("Renderer attempted to prevent unload — allowing close");
    event.preventDefault();
  });

  return mainWindow;
}

function createPreviewWindow() {
  log("Creating preview window...");

  const preloadPath = path.join(appRoot, "electron", "preload.js");
  const fallbackBounds = { width: 1280, height: 800 };
  const sourceWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const bounds = sourceWindow ? sourceWindow.getBounds() : fallbackBounds;

  previewWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#1a1a2e",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  previewWindow.on("closed", () => {
    log("Preview window closed");
    previewWindow = null;
  });

  previewWindow.on("ready-to-show", () => {
    if (!previewWindow) return;

    log("Preview window ready to show");
    previewWindow.maximize();
    previewWindow.show();
    previewWindow.focus();
  });

  previewWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    log(`Preview failed to load: ${errorDescription} (${errorCode}) - URL: ${validatedURL}`);
  });

  previewWindow.webContents.on("will-prevent-unload", (event) => {
    log("Preview renderer attempted to prevent unload — allowing close");
    event.preventDefault();
  });

  return previewWindow;
}

async function openPreviewWindow(pageId) {
  if (pageId === null || pageId === undefined || pageId === "") {
    return;
  }

  const previewUrl = getRendererUrl(`/preview/${encodeURIComponent(String(pageId))}`);

  if (previewWindow && !previewWindow.isDestroyed()) {
    log(`Reusing preview window for URL: ${previewUrl}`);

    if (previewWindow.webContents.getURL() !== previewUrl) {
      await previewWindow.loadURL(previewUrl);
    }

    if (previewWindow.isMinimized()) {
      previewWindow.restore();
    }

    previewWindow.maximize();
    previewWindow.show();
    previewWindow.focus();
    return;
  }

  const window = createPreviewWindow();
  log(`Loading preview URL: ${previewUrl}`);
  await window.loadURL(previewUrl);
}

// Show a lightweight loading page while services start
function showLoadingScreen() {
  if (!mainWindow) {
    return;
  }
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Widgetizer</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1a1a2e;
          color: #eee;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .card {
          text-align: center;
        }
        .spinner {
          width: 42px;
          height: 42px;
          border: 4px solid #4a4a6a;
          border-top-color: #8b8bd6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="spinner"></div>
        <div>Starting Widgetizer...</div>
      </div>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// Load content into the window
async function loadContent() {
  const isDev = getIsDev();

  if (isDev) {
    // Development: load Vite dev server
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    log(`Loading dev URL: ${devUrl}`);
    try {
      await mainWindow.loadURL(devUrl);
      mainWindow.webContents.openDevTools({ mode: "detach" });
      log("Dev content loaded successfully");
    } catch (err) {
      log(`Failed to load dev URL: ${err.message}`);
      showError(`Failed to connect to dev server at ${devUrl}\n\nMake sure the Vite dev server is running.`);
    }
  } else {
    // Production: wait for server and load
    log("Production mode - waiting for server...");
    try {
      await waitForServerReady();
      const prodUrl = `http://127.0.0.1:${serverPort}`;
      log(`Loading production URL: ${prodUrl}`);
      await mainWindow.loadURL(prodUrl);
      log("Production content loaded successfully");
    } catch (err) {
      log(`Failed to load production content: ${err.message}`);
      showError(
        `Failed to start the Widgetizer server.\n\n` +
          `Error: ${err.message}\n\n` +
          `Check the log file at:\n${path.join(logsDir, "widgetizer.log")}`,
      );
    }
  }
}

// Show error in window
function showError(message) {
  log(`Showing error to user: ${message}`);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Widgetizer - Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1a1a2e;
          color: #eee;
          padding: 40px;
          margin: 0;
        }
        h1 { color: #ff6b6b; margin-bottom: 20px; }
        pre {
          background: #0f0f1a;
          padding: 20px;
          border-radius: 8px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .btn {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 20px;
          background: #4a4a6a;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn:hover { background: #5a5a7a; }
      </style>
    </head>
    <body>
      <h1>Startup Error</h1>
      <pre>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      <button class="btn" onclick="location.reload()">Retry</button>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// Create application menu
function showAboutDialog() {
  const version = app.getVersion();

  dialog.showMessageBox({
    type: "info",
    title: "About Widgetizer",
    message: "Widgetizer",
    detail: `Version ${version}`,
    buttons: ["OK"],
  });
}

function createAppMenu() {
  const isMac = process.platform === "darwin";
  const isDev = getIsDev();

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "Open Data Folder",
          accelerator: isMac ? "Cmd+Shift+D" : "Ctrl+Shift+D",
          click: () => {
            shell.openPath(dataRoot);
          },
        },
        {
          label: "Open Logs Folder",
          click: () => {
            shell.openPath(logsDir);
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [{ role: "pasteAndMatchStyle" }, { role: "delete" }, { role: "selectAll" }]
          : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
      ],
    },
    // View menu
    {
      label: "View",
      submenu: [
        ...(isDev
          ? [{ role: "reload" }, { role: "forceReload" }, { role: "toggleDevTools" }, { type: "separator" }]
          : []),
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    // Window menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }]
          : [{ role: "close" }]),
      ],
    },
    // Help menu
    {
      role: "help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            shell.openExternal(DOCS_URL);
          },
        },
        {
          label: "About Widgetizer",
          click: () => {
            showAboutDialog();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupIpcHandlers() {
  ipcMain.on("open-external", (_event, url) => {
    if (typeof url === "string" && /^https?:\/\//.test(url)) {
      shell.openExternal(url);
    }
  });

  ipcMain.on("open-preview-window", (_event, pageId) => {
    openPreviewWindow(pageId).catch((err) => {
      log(`Failed to open preview window: ${err.message}`);
    });
  });
}

// Auto-updater setup
function setupAutoUpdater() {
  if (getIsDev()) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.logger = {
    info: (msg) => log(`[updater] ${msg}`),
    warn: (msg) => log(`[updater WARN] ${msg}`),
    error: (msg) => log(`[updater ERROR] ${msg}`),
  };

  const requestedUpdaterUrl = getUpdaterOverrideUrl();
  const updaterUrl = normalizeUpdaterUrl(requestedUpdaterUrl);

  if (requestedUpdaterUrl && !updaterUrl) {
    log(`Invalid updater override URL ignored: ${requestedUpdaterUrl}`);
  }

  if (updaterUrl) {
    log(`Using updater override feed: ${updaterUrl}`);
    autoUpdater.setFeedURL({
      provider: "generic",
      url: updaterUrl,
    });
  }

  autoUpdater.on("update-available", (info) => {
    log(`Update available: ${info.version}`);
    if (mainWindow) {
      mainWindow.webContents.send("update-available", {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
  });

  autoUpdater.on("update-not-available", () => {
    log("No updates available");
  });

  autoUpdater.on("download-progress", (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-download-progress", {
        percent: Math.round(progress.percent),
      });
    }
  });

  autoUpdater.on("update-downloaded", () => {
    log("Update downloaded, will install on quit");
    if (mainWindow) {
      mainWindow.webContents.send("update-downloaded");
    }
  });

  autoUpdater.on("error", (err) => {
    log(`Update error: ${err.message}`);
  });

  ipcMain.on("download-update", () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("install-update", () => {
    autoUpdater.quitAndInstall();
  });

  // Check for updates after a short delay to avoid slowing down startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log(`Update check failed: ${err.message}`);
    });
  }, 10000);
}

// App lifecycle
app.whenReady().then(async () => {
  log("App ready event fired");

  try {
    initLogging();
    initPaths();
    ensureDataDirectories();
    createAppMenu();
    setupIpcHandlers();
    setupAutoUpdater();

    // Create window first so user sees something
    createWindow();

    // Show a loading screen immediately
    showLoadingScreen();

    // Start server (non-blocking)
    startServer();

    // Load content (may take time waiting for server)
    if (getIsDev()) {
      await loadContent();
    } else {
      loadContent();
    }
  } catch (err) {
    log(`Fatal error during startup: ${err.message}\n${err.stack}`);
    if (mainWindow) {
      showError(`Fatal error: ${err.message}`);
    } else {
      dialog.showErrorBox("Widgetizer Error", `Failed to start: ${err.message}`);
      app.quit();
    }
  }
});

app.on("activate", () => {
  log("App activate event");
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    loadContent();
  }
});

app.on("before-quit", () => {
  log("App before-quit event");
  isQuitting = true;
  stopServer();
});

app.on("window-all-closed", () => {
  log("All windows closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle uncaught exceptions — avoid blocking dialog during quit
let isQuitting = false;

process.on("uncaughtException", (err) => {
  log(`Uncaught exception: ${err.message}\n${err.stack}`);
  if (!isQuitting) {
    dialog.showErrorBox("Widgetizer Error", `Uncaught exception: ${err.message}`);
  }
});

process.on("unhandledRejection", (reason) => {
  log(`Unhandled rejection: ${reason}`);
});
