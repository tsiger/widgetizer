/**
 * Asset URL construction — the single source of truth for turning an asset
 * filename into a URL, in both publish (static export) and preview (API-served)
 * mode.
 *
 * Every stylesheet/script-emitting site funnels through `buildAssetUrl`: the
 * `{% asset %}`, `{% header_assets %}` (enqueued styles/scripts and their
 * script/style preloads) and `{% footer_assets %}` tags, plus the render
 * engine's enqueued-asset writer. Keeping them on one function is what lets the
 * export cache-busting format change in one place, and what keeps a preload's
 * href byte-identical to the request it warms.
 */

// Only stylesheets and scripts carry the cache-busting query. Images and other
// binaries are re-copied under their own names, so a token there would churn
// every export URL for nothing. Case-insensitive: the enqueue tags accept any
// filename, and a `Theme.CSS` must still be recognised as a stylesheet.
const STYLESHEET_OR_SCRIPT = /\.(css|js)$/i;

/**
 * Split an asset reference into its path and any trailing `?query` / `#fragment`
 * so extension checks and the `?v=` token both see the right part.
 * @param {string} filepath
 * @returns {{ path: string, query: string, hash: string }}
 */
export function splitAssetRef(filepath) {
  const hashIdx = filepath.indexOf("#");
  const hash = hashIdx === -1 ? "" : filepath.slice(hashIdx);
  const beforeHash = hashIdx === -1 ? filepath : filepath.slice(0, hashIdx);
  const queryIdx = beforeHash.indexOf("?");
  const query = queryIdx === -1 ? "" : beforeHash.slice(queryIdx);
  const path = queryIdx === -1 ? beforeHash : beforeHash.slice(0, queryIdx);
  return { path, query, hash };
}

/** True for `.css` / `.js` references (any case), ignoring any query or fragment. */
export function isStylesheetOrScript(filepath) {
  return STYLESHEET_OR_SCRIPT.test(splitAssetRef(filepath).path);
}

// Keep a token segment URL-safe without mangling semver: dots and dashes stay
// (so "1.0.0-beta.1" survives intact), anything else is dropped.
function sanitizeSegment(value) {
  return String(value ?? "").replace(/[^A-Za-z0-9.-]/g, "");
}

// "2026-08-06T14:25:30.123Z" -> "20260806T142530" (UTC, so the same build stamps
// identically regardless of the machine's timezone).
function compactUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "");
}

/**
 * Build the cache-busting token stamped onto exported CSS/JS URLs as `?v=…`.
 *
 * Format: `<exportNumber>-<appVersion>-<YYYYMMDDTHHMMSS>`, e.g.
 * `3-0.9.10-20260806T142530`. It is meant to be read at a glance in page source:
 * which export, built by which Widgetizer version, and when (UTC).
 *
 * The timestamp is what makes the token effectively unique. The export number
 * alone is a per-machine SQLite counter, so a project moved between computers
 * (backup export → import elsewhere) restarts at 1 and would re-issue tokens
 * that browsers and CDNs already cached against completely different bytes.
 * The stamp is second-granular, so a collision needs the same export number,
 * app version and UTC second — on two machines, or on one machine after
 * deleting export history (which lowers the counter) and re-exporting within
 * the same second. Accepted as negligible. `sanitizeSegment` strips the `+` of
 * semver build metadata but keeps the text after it (`1.2.3+build.7` →
 * `1.2.3build.7`); prerelease suffixes survive intact.
 *
 * @param {object} params
 * @param {number|string} [params.exportNumber] - Per-project export counter
 * @param {string} [params.appVersion] - Widgetizer version that produced the export
 * @param {Date} [params.date] - Build time; defaults to now
 * @returns {string}
 */
export function buildAssetVersionToken({ exportNumber, appVersion, date = new Date() } = {}) {
  const segments = [];

  const numberSegment = sanitizeSegment(exportNumber);
  if (numberSegment) segments.push(numberSegment);

  segments.push(sanitizeSegment(appVersion) || "unknown");
  segments.push(compactUtcStamp(date));

  return segments.join("-");
}

/**
 * Resolve the URL for an asset referenced from a template.
 *
 * Publish mode emits a relative `assets/…` path (prefixed with the render's
 * depth prefix for nested item pages) plus the cache-busting token from
 * `globals.assetVersion`. Preview mode routes through the preview API, from the
 * widget's own directory when the asset was enqueued by a widget.
 *
 * @param {string} filepath - Asset filename, e.g. "base.css"
 * @param {object} params
 * @param {object} params.globals - Render globals (renderMode, apiUrl, projectId,
 *   outputPathPrefix, assetVersion)
 * @param {string|null} [params.source] - "widget" when enqueued from a widget
 * @param {string|null} [params.widgetType] - Widget type owning the asset
 * @returns {string}
 */
export function buildAssetUrl(filepath, { globals = {}, source = null, widgetType = null } = {}) {
  const renderMode = globals.renderMode || "preview";

  if (renderMode === "publish") {
    // Depth-aware prefix for nested item pages ("" at the export root).
    const { path, query, hash } = splitAssetRef(filepath);
    const url = `${globals.outputPathPrefix || ""}assets/${path}`;
    const version = globals.assetVersion;
    if (!version || !STYLESHEET_OR_SCRIPT.test(path)) return `${url}${query}${hash}`;
    // Keep an author-supplied query; the token joins it rather than replacing it.
    return `${url}${query ? `${query}&` : "?"}v=${version}${hash}`;
  }

  const apiUrl = globals.apiUrl || "";
  const projectId = globals.projectId || "";

  if (source === "widget" && widgetType) {
    return `${apiUrl}/api/preview/assets/${projectId}/widgets/${widgetType}/${filepath}`;
  }
  return `${apiUrl}/api/preview/assets/${projectId}/assets/${filepath}`;
}
