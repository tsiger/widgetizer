// The export viewer's origins, for when the Electron main process can't be told
// them by the server (the internal server is disabled and an external one runs
// with the same EXPORT_VIEWER_* settings). Mirrors LocalExportViewer's settings:
// EXPORT_VIEWER_PORT is a port or "off"; EXPORT_VIEWER_URL is the viewer's
// public address. An invalid port or URL, or a non-http(s) URL, is ignored.
const MAX_PORT = 65535;

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function viewerOriginsFromEnv(env) {
  const origins = [];

  const setting = env.EXPORT_VIEWER_PORT?.trim();
  if (setting && /^\d+$/.test(setting)) {
    const port = Number(setting);
    // Port 0 asks for an OS-assigned port, which can't be known from the env.
    if (port > 0 && port <= MAX_PORT) {
      origins.push(`http://127.0.0.1:${port}`, `http://localhost:${port}`);
    }
  }

  const override = env.EXPORT_VIEWER_URL;
  if (override) {
    try {
      const url = new URL(override);
      if (url.protocol === "http:" || url.protocol === "https:") origins.push(url.origin);
    } catch {
      // Not a URL: nothing to allow.
    }
  }

  return origins;
}
