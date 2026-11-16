/**
 * The export site: an Express app that serves one export with its site path as
 * the root, the way a real host would, so root-relative links and 404 pages work.
 * It holds no export of its own: `getCurrent()` names the one to serve, read on
 * every request. The app never listens; the shell that owns the viewer port
 * wraps it in a server.
 *
 * One origin serves different exports over time, so every response is
 * `no-store`, and the start page clears the origin's storage before moving on
 * to the requested page.
 */
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { resolveExportFile } from "../utils/exportFiles.js";
import { getContentType } from "../utils/mimeTypes.js";
import { isWithinDirectory } from "../utils/pathSecurity.js";
import { sendFileDone } from "../utils/sendFileOutcome.js";

/** The start page's path, reserved on the viewer origin. Its `to` query names the destination. */
export const START_PATH = "/__widgetizer/view-start";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * The path the start page moves on to: `to` when it parses as a same-origin
 * reference, else the site path. The parser already reads `//host`, `/\host` and
 * absolute URLs as other origins.
 *
 * Path-only, so the browser resolves it against whatever address it used for
 * the viewer (behind a proxy too) and no Host header is trusted. A path starting
 * with `//` would be read as another host, so it gets a `/.` in front, which the
 * URL parser removes: `/.//other.example/x` stays on the viewer origin.
 *
 * @param {string|undefined} to - the requested destination, already URL-decoded
 * @param {string} sitePath - the export's site path, e.g. "/" or "/repo/"
 * @returns {string}
 */
export function startDestination(to, sitePath) {
  if (typeof to === "string" && !CONTROL_CHARS.test(to)) {
    try {
      const parsed = new URL(to, PARSE_ORIGIN);
      if (parsed.origin === PARSE_ORIGIN) return pathOnly(parsed);
    } catch {
      // Not a URL: fall back to the site path.
    }
  }
  return sitePathOnly(sitePath);
}

// Any fixed origin works: only whether `to` stays on it matters.
const PARSE_ORIGIN = "http://viewer.invalid";

function pathOnly(url) {
  const result = url.pathname + url.search + url.hash;
  return result.startsWith("//") ? `/.${result}` : result;
}

// The site path is assigned as a path, never resolved as a reference, so a
// `//host`-shaped one (from a Site URL like `https://example.com//other.example/`)
// stays on the viewer origin. `search` is the raw query, "?" included, or "".
function sitePathOnly(sitePath, search = "") {
  const url = new URL(PARSE_ORIGIN);
  url.pathname = normalizeSitePath(sitePath);
  url.search = search;
  return pathOnly(url);
}

// Always ends with "/", so "/repo" can't match "/repository/…".
function normalizeSitePath(sitePath) {
  if (typeof sitePath !== "string" || !sitePath) return "/";
  return sitePath.endsWith("/") ? sitePath : `${sitePath}/`;
}

// `siteUrlPathname()` gives the path URL-encoded ("/my%20repo/"), while request
// paths are compared decoded, so the site path is decoded too.
function decodeSitePath(sitePath) {
  try {
    return decodeURIComponent(sitePath);
  } catch {
    return sitePath;
  }
}

/**
 * @param {{ getCurrent: () => (null | { exportRoot: string, sitePath: string }) }} options
 * @returns {import('express').Express} the app; call `http.createServer(app)` yourself
 */
export function createExportSiteApp({ getCurrent }) {
  const app = express();
  app.disable("x-powered-by");

  app.use((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      handle(req, res, getCurrent());
    } catch (error) {
      console.error("Error serving the export site:", error);
      if (!res.headersSent) sendPlain(res, 500, "Internal error");
    }
  });

  return app;
}

function handle(req, res, current) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendPlain(res, 405, "Method not allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(req.path);
  } catch {
    return sendPlain(res, 404, "Not found");
  }

  const sitePath = normalizeSitePath(current?.sitePath);

  if (pathname === START_PATH) {
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    return sendStartPage(res, startDestination(to, sitePath));
  }

  if (!current) {
    return sendHtml(
      res,
      404,
      "<!doctype html><html><head><meta charset=\"utf-8\"><title>No export open</title></head>" +
        "<body><p>Open an export from the Export page.</p></body></html>",
    );
  }

  const decodedSitePath = decodeSitePath(sitePath);
  if (sitePath !== "/" && (pathname === "/" || pathname === decodedSitePath.slice(0, -1))) {
    const queryAt = req.originalUrl.indexOf("?");
    const search = queryAt < 0 ? "" : req.originalUrl.slice(queryAt);
    res.status(302).setHeader("Location", sitePathOnly(sitePath, search));
    return res.end();
  }
  if (!pathname.startsWith(decodedSitePath)) return sendPlain(res, 404, "Not found");

  const rel = pathname.slice(decodedSitePath.length).replace(/^\/+/, "");
  // Decoded `..`, `.`, backslashes and NUL never reach the file system: a
  // traversal attempt gets a plain 404, not even the export's own 404 page.
  if (rel.includes("\0") || rel.includes("\\") || rel.split("/").some((s) => s === ".." || s === ".")) {
    return sendPlain(res, 404, "Not found");
  }

  const exportRoot = path.resolve(current.exportRoot);
  // Read per request: the export can change, and its path may itself run
  // through a symlinked folder (macOS's /var → /private/var).
  let realRoot;
  try {
    realRoot = fs.realpathSync(exportRoot);
  } catch {
    return sendPlain(res, 404, "Not found");
  }
  const site = { exportRoot, realRoot };
  const file = resolveExportFile(path.dirname(exportRoot), path.basename(exportRoot), rel || "index.html");
  if (!file || !realPathInside(file, realRoot)) return sendNotFound(res, site, rel);
  sendExportFile(res, exportRoot, file, 200, () => sendNotFound(res, site, rel));
}

/**
 * Whether `file`, with every symlink followed, is inside the export. The
 * lexical checks pass a link inside the export that points elsewhere, and
 * `send` follows it, so an export carrying `assets/x -> /etc` would serve
 * outside files. Links to files inside the export still work.
 */
function realPathInside(file, realRoot) {
  try {
    return isWithinDirectory(fs.realpathSync(file), realRoot);
  } catch {
    return false;
  }
}

/**
 * A miss: the nearest `404.html` walking up from the requested folder to the
 * export root (so `/el/missing` gets `el/404.html` when that exists), with
 * status 404; a plain 404 when the export has none.
 */
function sendNotFound(res, { exportRoot, realRoot }, rel) {
  const folders = rel.split("/").slice(0, -1).filter(Boolean);
  for (let depth = folders.length; depth >= 0; depth--) {
    const candidate = path.resolve(exportRoot, ...folders.slice(0, depth), "404.html");
    if (!isWithinDirectory(candidate, exportRoot)) continue;
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
    if (!realPathInside(candidate, realRoot)) continue;
    return sendExportFile(res, exportRoot, candidate, 404, () => sendPlain(res, 404, "Not found"));
  }
  return sendPlain(res, 404, "Not found");
}

/**
 * Sends a file of the export with its content type, as the editor's export view
 * does. It goes relative to the export so only the part inside it is checked for
 * dot-folders: `send` refuses any path with one, and the desktop app's data
 * lives under `~/.config` on Linux. A dot-file inside the export stays refused,
 * and that refusal (or any failure before the headers) goes to `onMiss`.
 */
function sendExportFile(res, exportRoot, file, status, onMiss) {
  if (!isWithinDirectory(file, exportRoot)) return onMiss();
  res.status(status);
  res.setHeader("Content-Type", getContentType(path.extname(file).toLowerCase()));
  res.sendFile(
    path.relative(exportRoot, file),
    { root: exportRoot, cacheControl: false },
    sendFileDone(res, (err) => {
      if (err.status === 404 || err.code === "ENOENT") return onMiss();
      console.error("Error sending export file %s:", file, err);
      sendPlain(res, 500, "Failed to serve file");
    }),
  );
}

/**
 * A 200 page, not a redirect: Safari ignores `Clear-Site-Data` on a redirect.
 * Only "storage" is cleared; "cookies" would clear them for the whole
 * registrable domain, signing the user out of other apps on `localhost`.
 */
function sendStartPage(res, destination) {
  res.setHeader("Clear-Site-Data", '"storage"');
  sendNavigationPage(res, destination);
}

/**
 * A 200 page that moves the browser on to `destination` with `location.replace`
 * (the meta refresh covers a browser without scripts). The script keeps the
 * current URL's fragment when the destination has none of its own, since a
 * script navigation doesn't carry it over the way a redirect does. The view
 * route uses it to reach the viewer's start page: Safari also ignores
 * `Clear-Site-Data` on a page reached through a redirect from another origin,
 * but honours it after a script navigation from one.
 *
 * @param {import('express').Response} res
 * @param {string} destination an absolute URL or a path-only destination
 */
export function sendNavigationPage(res, destination) {
  const attr = escapeHtml(destination);
  const json = JSON.stringify(destination)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  res.setHeader("Cache-Control", "no-store");
  sendHtml(
    res,
    200,
    `<!doctype html>
<html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Opening export</title>
<noscript><meta http-equiv="refresh" content="0;url=${attr}"></noscript>
<script>
(function () {
  var to = ${json};
  if (location.hash && to.indexOf("#") < 0) to += location.hash;
  location.replace(to);
})();
</script>
</head><body><p><a href="${attr}">Open the export</a></p></body></html>`,
  );
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendHtml(res, status, html) {
  res.status(status).type("html").send(html);
}

function sendPlain(res, status, text) {
  res.status(status).type("text/plain").send(text);
}
