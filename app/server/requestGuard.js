import { BRIDGE_BASE, EDITOR_CREDENTIAL_HEADER } from "@widgetizer/assistant/protocol";
import { secretsMatch } from "@widgetizer/assistant";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

function hostnameOf(host) {
  if (!host) return null;
  const match = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/.exec(host.toLowerCase());
  return match ? { name: match[1], port: match[2] ?? null } : null;
}

function isUnder(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * Request guard for the OSS server. Blocks DNS rebinding (a Host that isn't this
 * server) and cross-site writes (an Origin that is missing or isn't this server or
 * an allowed dev origin). When an editor secret is configured (the desktop app),
 * writes and control routes must also carry it.
 *
 * Paths are compared lowercased because Express routes match case-insensitively.
 * The relay's bridge routes are exempt here: they carry their own credentials.
 * This does not keep out a program running as the same user on the same machine.
 *
 * @param {{
 *   getPort: () => number|null,
 *   loopbackOnly: boolean,
 *   allowedHosts?: string[],
 *   extraOrigins?: string[],
 *   editorSecret?: string|null,
 *   controlPaths?: string[],
 * }} options - `loopbackOnly` when bound to loopback: the Host must name the bound
 *   port. Otherwise loopback names on any port (a container's published port) and
 *   `allowedHosts` are accepted.
 */
export function createRequestGuard({
  getPort,
  loopbackOnly,
  allowedHosts = [],
  extraOrigins = [],
  editorSecret = null,
  controlPaths = [],
}) {
  const configuredHosts = new Set(allowedHosts.map((host) => host.toLowerCase()));
  const bridgeBase = BRIDGE_BASE.toLowerCase();
  const controls = controlPaths.map((prefix) => prefix.toLowerCase());

  function hostAllowed(host) {
    const parsed = hostnameOf(host);
    if (!parsed) return false;
    if (configuredHosts.has(host.toLowerCase()) || configuredHosts.has(parsed.name)) return true;
    if (!LOOPBACK_HOSTNAMES.has(parsed.name)) return false;
    return loopbackOnly ? parsed.port === String(getPort()) : true;
  }

  return (req, res, next) => {
    const host = req.headers.host;
    if (!hostAllowed(host)) {
      return res.status(421).json({ error: "Unexpected Host header." });
    }

    const path = req.path.toLowerCase();
    if (isUnder(path, bridgeBase)) return next();

    const isControl = controls.some((prefix) => isUnder(path, prefix));
    const isWrite = !SAFE_METHODS.has(req.method);
    if (!isWrite && !isControl) return next();

    if (isWrite) {
      const origin = req.headers.origin;
      const sameOrigin = origin === `http://${host}` || origin === `https://${host}`;
      if (!origin || !(sameOrigin || extraOrigins.includes(origin))) {
        return res.status(403).json({ error: "Request origin not allowed." });
      }
    }

    if (editorSecret && !secretsMatch(req.get(EDITOR_CREDENTIAL_HEADER), editorSecret)) {
      return res.status(403).json({ error: "Editor credential required." });
    }

    next();
  };
}
