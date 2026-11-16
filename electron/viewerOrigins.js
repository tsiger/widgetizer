// The export viewer's origins, for when the Electron main process can't be told
// them by the server (the internal server is disabled and an external one runs
// with the same EXPORT_VIEWER_* settings). The settings read exactly as
// LocalExportViewer reads them; only a fixed port can be known from the env (0
// asks the OS for one).
import { viewerOrigins, viewerPortSetting } from "@widgetizer/adapters-local/exportViewerSettings";

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function viewerOriginsFromEnv(env) {
  const setting = viewerPortSetting(env.EXPORT_VIEWER_PORT);
  const port = setting.kind === "port" && setting.port > 0 ? setting.port : null;
  return viewerOrigins(port, env.EXPORT_VIEWER_URL);
}
