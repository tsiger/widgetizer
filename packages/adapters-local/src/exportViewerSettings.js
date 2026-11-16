/**
 * How the export viewer's settings read, shared by `LocalExportViewer` (which
 * binds the viewer) and the desktop app's main process (which lets the viewer's
 * origins load in its windows when it can't be told them by the server). It
 * imports nothing, so the Electron main process loads it without the rest of the
 * package.
 *
 * `EXPORT_VIEWER_PORT` is a port, `0` for an OS-assigned one, or `off` (any
 * case); `EXPORT_VIEWER_URL` is the viewer's public address.
 */

export const MAX_PORT = 65535;

/**
 * @param {string|undefined} value EXPORT_VIEWER_PORT
 * @returns {{ kind: "unset" } | { kind: "off" } | { kind: "port", port: number } | { kind: "invalid", value: string }}
 */
export function viewerPortSetting(value) {
  const setting = typeof value === "string" ? value.trim() : "";
  if (!setting) return { kind: "unset" };
  if (setting.toLowerCase() === "off") return { kind: "off" };
  if (/^\d+$/.test(setting) && Number(setting) <= MAX_PORT) return { kind: "port", port: Number(setting) };
  return { kind: "invalid", value: setting };
}

/**
 * The origin of an `EXPORT_VIEWER_URL`, or null when it isn't an absolute
 * http(s) URL (the setting is then ignored). Only the origin counts: the viewer
 * serves the export with `/` as its root and the start page moves on to
 * path-only destinations, so a path in the setting couldn't be kept past the
 * start page anyway, and a query or fragment would break the start page's URL.
 *
 * @param {string|undefined} value
 * @returns {string|null}
 */
export function overrideOrigin(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * The origins a desktop shell lets the viewer load in: the loopback forms of its
 * port (none when there is no port), plus `EXPORT_VIEWER_URL`'s origin.
 *
 * @param {number|null|undefined} port
 * @param {string|undefined} overrideUrl
 * @returns {string[]}
 */
export function viewerOrigins(port, overrideUrl) {
  const list = port ? [`http://127.0.0.1:${port}`, `http://localhost:${port}`] : [];
  const override = overrideOrigin(overrideUrl);
  if (override) list.push(override);
  return list;
}
