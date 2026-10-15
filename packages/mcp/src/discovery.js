import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CONNECTION_DIR, CONNECTION_FILE, CONNECTION_FILE_FORMAT } from "@widgetizer/assistant/protocol";

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/** Where the desktop app keeps its data on this platform (Electron's userData/data). */
export function defaultDataRoot({ platform = process.platform, env = process.env, home = os.homedir() } = {}) {
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "Widgetizer", "data");
  }
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "Widgetizer", "data");
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(home, ".config"), "Widgetizer", "data");
}

// Claude Desktop passes an optional setting the user left empty as its literal
// "${user_config.…}" placeholder, which must not be taken for a folder.
function isUnsetValue(value) {
  return !value || value.startsWith("${user_config.");
}

export function resolveDataRoot({ argv = process.argv.slice(2), env = process.env } = {}) {
  const flag = argv.indexOf("--data-root");
  if (flag !== -1 && !isUnsetValue(argv[flag + 1])) return path.resolve(argv[flag + 1]);
  if (env.WIDGETIZER_DATA_ROOT) return path.resolve(env.WIDGETIZER_DATA_ROOT);
  return defaultDataRoot({ env });
}

export function connectionFilePath(dataRoot) {
  return path.join(dataRoot, CONNECTION_DIR, CONNECTION_FILE);
}

/**
 * Read and validate the connection file. Returns null when it is missing or not
 * something this relay may send a token to.
 */
export async function readConnection(dataRoot) {
  let record;
  try {
    record = JSON.parse(await fs.readFile(connectionFilePath(dataRoot), "utf8"));
  } catch {
    return null;
  }
  if (
    record?.format !== CONNECTION_FILE_FORMAT ||
    record.app !== "widgetizer" ||
    typeof record.token !== "string" ||
    typeof record.instanceId !== "string" ||
    typeof record.url !== "string"
  ) {
    return null;
  }
  let url;
  try {
    url = new URL(record.url);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTNAMES.has(url.hostname)) return null;
  return { url: url.origin, token: record.token, instanceId: record.instanceId };
}
