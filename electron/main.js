import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell, utilityProcess } from "electron";
import crypto from "crypto";
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isSafePreviewPath } from "./previewPath.js";
import { createServerRpc } from "./serverRpc.js";
import { createEnableGate, isTrustedSender } from "./assistantPrompt.js";
import { promptHtml, actionFromUrl, serverCallFor } from "./assistantPromptWindow.js";
import { windowOpenTarget } from "./windowOpenPolicy.js";

// Constants
const DEFAULT_PORT = "3001";
const SERVER_STARTUP_TIMEOUT_MS = 30000;
const DOCS_URL = "https://docs.widgetizer.org";
const SERVER_SHUTDOWN_TIMEOUT_MS = 6000;
const EDITOR_CREDENTIAL_HEADER = "X-Widgetizer-Editor";
const EDITOR_SECRET = crypto.randomBytes(32).toString("base64url");

// State
let mainWindow = null;
let previewWindow = null;
let serverProcess = null;
let serverRpc = null;
let logFile = null;
let serverReadyDeferred = null;

// Paths - computed after app is ready
let appRoot = null; // Path to app.asar (for Electron-loaded resources)
let unpackedRoot = null; // Path to app.asar.unpacked (for Node.js server resources)
let resourcesPath = null;
let userDataPath = null;
let dataRoot = null;
let themesRoot = null;
let logsDir = null;

// Resolved once the bundled server reports the port it actually bound to via
// the "server-ready" IPC message. When the internal server is disabled, falls
// back to the env/default port so the renderer can still target an external API.
let serverPort = null;

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
  const serverEntry = path.join(appRoot, "electron", "server-bootstrap.js");

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

  // PORT=0 → server asks the OS for an ephemeral port at bind time and reports
  // it back via the "server-ready" message. Explicit PORT env still wins.
  const requestedPort = process.env.PORT || "0";

  const env = {
    ...process.env,
    NODE_ENV: isDev ? "development" : "production",
    PORT: requestedPort,
    DATA_ROOT: dataRoot,
    THEMES_ROOT: themesRoot,
    APP_ROOT: appRoot,
    UNPACKED_ROOT: unpackedRoot,
    WIDGETIZER_EDITOR_SECRET: EDITOR_SECRET,
  };

  // Set up the readiness deferred BEFORE forking so a fast server can't race us.
  serverReadyDeferred = createDeferred();

  try {
    serverProcess = utilityProcess.fork(serverEntry, [], {
      cwd: userDataPath,
      env,
      stdio: "pipe",
    });
    serverRpc = createServerRpc(serverProcess);

    serverProcess.stdout.on("data", (data) => {
      log(`[server stdout] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on("data", (data) => {
      log(`[server stderr] ${data.toString().trim()}`);
    });

    serverProcess.on("message", (msg) => {
      if (msg && msg.type === "server-ready" && typeof msg.port === "number") {
        serverPort = String(msg.port);
        log(`Server reported ready on port ${serverPort}`);
        serverReadyDeferred?.resolve();
      }
      if (msg && msg.type === "server-error" && typeof msg.message === "string") {
        serverReadyDeferred?.reject(new Error(msg.message));
      }
      if (msg && msg.type === "assistant-prompt") showAssistantPrompt(msg.prompt ?? null);
    });

    serverProcess.on("exit", (code) => {
      log(`Server process exited with code ${code}`);
      serverProcess = null;
      serverRpc = null;
      // If the server died before reporting ready, fail the waiter so the user
      // sees the startup error instead of hanging until the timeout.
      serverReadyDeferred?.reject(new Error(`Server process exited with code ${code} before ready`));
    });

    // PID is available after the 'spawn' event fires
    serverProcess.on("spawn", () => {
      log(`Server process spawned with PID: ${serverProcess.pid}`);
    });
  } catch (err) {
    log(`Failed to spawn server process: ${err.message}`);
    serverReadyDeferred?.reject(err);
  }
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  let settled = false;
  return {
    promise,
    resolve: (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    },
    reject: (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    },
  };
}

let serverStopping = null;

// Ask the server to shut down cleanly (it withdraws assistant access), and kill it
// if it hasn't exited in time.
function stopServer() {
  if (!serverProcess) return Promise.resolve();
  serverStopping ??= new Promise((resolve) => {
    const child = serverProcess;
    log("Stopping server process...");
    const timer = setTimeout(() => {
      log("Server did not exit in time; killing it");
      child.kill();
    }, SERVER_SHUTDOWN_TIMEOUT_MS);
    child.once("exit", () => {
      clearTimeout(timer);
      serverProcess = null;
      resolve();
    });
    serverRpc?.close();
    child.postMessage({ type: "shutdown" });
  });
  return serverStopping;
}

// The editor credential is added by the main process, never handed to page
// scripts: only to API requests from the top frame of our own windows, while that
// frame shows the editor. Preview content in iframes never gets it.
function isTrustedEditorRequest(details) {
  if (!serverPort || !details.frame || details.frame.parent) return false;
  const owner = details.webContents && BrowserWindow.fromWebContents(details.webContents);
  if (!owner || (owner !== mainWindow && owner !== previewWindow)) return false;
  try {
    const target = new URL(details.url);
    const frameOrigin = new URL(details.frame.url).origin;
    const apiHosts = new Set(["127.0.0.1", "localhost"]);
    return (
      target.protocol === "http:" &&
      apiHosts.has(target.hostname) &&
      target.port === String(serverPort) &&
      frameOrigin === new URL(getRendererBaseUrl()).origin
    );
  } catch {
    return false;
  }
}

function setupEditorCredential() {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    for (const name of Object.keys(requestHeaders)) {
      if (name.toLowerCase() === EDITOR_CREDENTIAL_HEADER.toLowerCase()) delete requestHeaders[name];
    }
    if (isTrustedEditorRequest(details)) requestHeaders[EDITOR_CREDENTIAL_HEADER] = EDITOR_SECRET;
    callback({ requestHeaders });
  });
}

// Wait for the bundled server to report its bound port via IPC.
function waitForServerReady() {
  if (process.env.ELECTRON_DISABLE_INTERNAL_SERVER === "1") {
    return Promise.resolve();
  }

  if (!serverReadyDeferred) {
    return Promise.reject(new Error("Server was not started"));
  }

  log("Waiting for server-ready message...");
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      log(`Server startup timed out after ${Date.now() - startTime}ms`);
      reject(new Error("Server startup timed out"));
    }, SERVER_STARTUP_TIMEOUT_MS);

    serverReadyDeferred.promise.then(
      () => {
        clearTimeout(timer);
        log(`Server ready after ${Date.now() - startTime}ms`);
        resolve();
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
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

  applyWindowOpenPolicy(mainWindow);

  mainWindow.on("closed", () => {
    log("Main window closed");
    mainWindow = null;
  });

  mainWindow.on("ready-to-show", () => {
    log("Window ready to show");
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
        title: "Widgetizer Desktop is not responding",
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

  // Don't let a stuck beforeunload handler prevent window close. Electron shows no
  // leave-page prompt of its own, and this can't distinguish a hung page from the
  // navigation guards' legitimate "unsaved changes" objection — so on desktop the
  // window closes without asking and unsaved edits are discarded. The in-app
  // guards only cover navigation inside the app. Whether the desktop app
  // should warn on close instead is an open product question.
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

  // Offset the preview window so it doesn't sit exactly on top of the editor
  // when the editor isn't maximized. Only meaningful when we have source bounds
  // — otherwise Electron centers the new window for us.
  const PREVIEW_OFFSET_PX = 50;
  const browserWindowOpts = {
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
  };
  if (sourceWindow && Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
    browserWindowOpts.x = bounds.x + PREVIEW_OFFSET_PX;
    browserWindowOpts.y = bounds.y + PREVIEW_OFFSET_PX;
  }

  previewWindow = new BrowserWindow(browserWindowOpts);
  applyWindowOpenPolicy(previewWindow);

  previewWindow.on("closed", () => {
    log("Preview window closed");
    previewWindow = null;
  });

  previewWindow.on("ready-to-show", () => {
    if (!previewWindow) return;

    log("Preview window ready to show");
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

// The Allow/Cancel and keep/undo questions, in a window of the app's own with no site content,
// so code in a page can't answer them. It doesn't block the editor, where Stop stays usable.
let promptWindow = null;
let shownPrompt = null;
let closingPrompt = false;

function showAssistantPrompt(prompt) {
  shownPrompt = prompt;
  if (!prompt) {
    if (promptWindow && !promptWindow.isDestroyed()) {
      closingPrompt = true;
      promptWindow.close();
    }
    promptWindow = null;
    return;
  }
  if (!promptWindow || promptWindow.isDestroyed()) {
    promptWindow = new BrowserWindow({
      width: 460,
      height: 340,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
      title: "Widgetizer",
      backgroundColor: "#ffffff",
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, javascript: false },
    });
    promptWindow.setMenuBarVisibility(false);
    promptWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    promptWindow.webContents.on("will-navigate", (event, url) => {
      event.preventDefault();
      answerAssistantPrompt(actionFromUrl(url));
    });
    // Closing a question is Cancel; the keep-or-undo choice stays until it is answered.
    promptWindow.on("close", (event) => {
      if (closingPrompt || isQuitting) return;
      if (shownPrompt?.kind === "decision") {
        event.preventDefault();
        return;
      }
      answerAssistantPrompt("cancel");
    });
    promptWindow.on("closed", () => {
      promptWindow = null;
      closingPrompt = false;
    });
  }
  promptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(promptHtml(prompt))}`);
  promptWindow.show();
  promptWindow.focus();
}

function answerAssistantPrompt(action) {
  const call = action && shownPrompt ? serverCallFor(action, shownPrompt) : null;
  if (!call || !serverRpc) return;
  serverRpc.call(call[0], call[1]).catch((error) => log(`Answering the assistant prompt failed: ${error.message}`));
}

async function askToEnableAssistant() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: "question",
    title: "Allow AI assistants?",
    message: "Allow AI assistants to read and change your sites?",
    detail:
      "Assistants such as Claude and Codex on this computer will be able to read and edit the site open in Widgetizer. You can turn this off at any time in Settings → AI Assistant.",
    buttons: ["Cancel", "Allow"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  return response === 1 && !isQuitting && Boolean(mainWindow) && !mainWindow.isDestroyed();
}

const requestAssistantEnable = createEnableGate({
  isTrusted: (event) =>
    isTrustedSender(event, {
      webContents: mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null,
      rendererOrigin: new URL(getRendererBaseUrl()).origin,
    }),
  getAccess: () => (serverRpc ? serverRpc.call("assistantAccess") : Promise.reject(new Error("No server"))),
  enable: () => (serverRpc ? serverRpc.call("enableAssistant") : Promise.reject(new Error("No server"))),
  ask: askToEnableAssistant,
});

// previewPath arrives over IPC and is untrusted; isSafePreviewPath (electron/previewPath.js)
// is the guard that keeps a hostile path from loading remote content into the privileged
// preview window. See that module for the full rationale.
async function openPreviewWindow(previewPath) {
  if (!isSafePreviewPath(previewPath)) {
    log(`Ignoring unsafe preview path: ${JSON.stringify(previewPath)}`);
    return;
  }

  const previewUrl = getRendererUrl(previewPath);

  if (previewWindow && !previewWindow.isDestroyed()) {
    log(`Reusing preview window for URL: ${previewUrl}`);

    if (previewWindow.webContents.getURL() !== previewUrl) {
      await previewWindow.loadURL(previewUrl);
    }

    if (previewWindow.isMinimized()) {
      previewWindow.restore();
    }

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
      <title>Widgetizer Desktop</title>
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
        <div>Starting Widgetizer Desktop...</div>
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
        `Failed to start the Widgetizer Desktop server.\n\n` +
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
      <title>Widgetizer Desktop - Error</title>
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
    title: "About Widgetizer Desktop",
    message: "Widgetizer Desktop",
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
          label: "About Widgetizer Desktop",
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

function contentOrigins() {
  return serverPort ? [`http://127.0.0.1:${serverPort}`, `http://localhost:${serverPort}`] : [];
}

// Pages shown in the app (the preview, an exported site, a theme's script) can call
// window.open or use target="_blank". Without a handler each would become a new app
// window that loads whatever it was given.
function applyWindowOpenPolicy(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    const target = windowOpenTarget(url, contentOrigins());
    if (target === "content") openContentWindow(url);
    else if (target === "external") shell.openExternal(url);
    return { action: "deny" };
  });
}

// Exports and media files run site code, so they get a window without the preload bridge.
function openContentWindow(url) {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#ffffff",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  applyWindowOpenPolicy(window);
  // The open handler only sees new windows; a link or redirect inside this one gets the same rule.
  const keepToAppContent = (event, legacyUrl, _isInPlace, legacyIsMainFrame) => {
    // will-redirect also fires inside iframes; an embedded map or video must keep its own redirects.
    if ((event.isMainFrame ?? legacyIsMainFrame) === false) return;
    const target = windowOpenTarget(event.url ?? legacyUrl, contentOrigins());
    if (target === "content") return;
    event.preventDefault();
    if (target === "external") shell.openExternal(event.url ?? legacyUrl);
  };
  window.webContents.on("will-navigate", keepToAppContent);
  window.webContents.on("will-redirect", keepToAppContent);
  window.loadURL(url).catch((err) => log(`Failed to open ${url}: ${err.message}`));
}

function setupIpcHandlers() {
  ipcMain.on("open-external", (_event, url) => {
    if (typeof url === "string" && /^https?:\/\//.test(url)) {
      shell.openExternal(url);
    }
  });

  ipcMain.handle("assistant:request-enable", (event) => requestAssistantEnable(event));

  ipcMain.on("open-preview-window", (_event, previewPath) => {
    openPreviewWindow(previewPath).catch((err) => {
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

  ipcMain.on("install-update", async () => {
    isQuitting = true;
    await stopServer();
    autoUpdater.quitAndInstall();
  });

  // Check for updates after a short delay to avoid slowing down startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log(`Update check failed: ${err.message}`);
    });
  }, 5000);
}

// App lifecycle
app.whenReady().then(async () => {
  log("App ready event fired");

  try {
    initLogging();
    initPaths();
    ensureDataDirectories();
    createAppMenu();
    setupEditorCredential();
    setupIpcHandlers();
    setupAutoUpdater();

    // Create window first so user sees something
    createWindow();

    // Show a loading screen immediately
    showLoadingScreen();

    // When the internal server is disabled, the renderer targets an external
    // API on this port. With the internal server enabled, serverPort is set
    // later by the "server-ready" message.
    if (process.env.ELECTRON_DISABLE_INTERNAL_SERVER === "1") {
      serverPort = process.env.PORT || DEFAULT_PORT;
    }

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
      dialog.showErrorBox("Widgetizer Desktop Error", `Failed to start: ${err.message}`);
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

app.on("before-quit", (event) => {
  log("App before-quit event");
  isQuitting = true;
  if (serverProcess) {
    event.preventDefault();
    stopServer().finally(() => app.quit());
  }
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
    dialog.showErrorBox("Widgetizer Desktop Error", `Uncaught exception: ${err.message}`);
  }
});

process.on("unhandledRejection", (reason) => {
  log(`Unhandled rejection: ${reason}`);
});
