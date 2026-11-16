/**
 * The export viewer for the OSS shells: a second HTTP listener that serves the
 * export the user last viewed with its site path as the root, on its own
 * origin. It owns the viewer port (which one, probing, binding) and the rules
 * for the address the app redirects to. The request handler comes from the
 * shell as a `createHandler({ getCurrent })` factory, so this package doesn't
 * depend on builder-server.
 *
 * Settings: `EXPORT_VIEWER_PORT` (a port, or `off` for no viewer) and
 * `EXPORT_VIEWER_URL` (the viewer's public address; see `overrideOrigin`).
 */
import http from "node:http";
import net from "node:net";

const PROBE_HOSTS = ["127.0.0.1", "::1", "::", "0.0.0.0"];
// A bind on a family the machine lacks says nothing about the port.
const FAMILY_ABSENT = new Set(["EADDRNOTAVAIL", "EAFNOSUPPORT"]);
const MAX_PORT = 65535;

function probe(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => resolve(FAMILY_ABSENT.has(err.code)));
    server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
  });
}

/**
 * Whether nothing holds `port` on any address form. On macOS a bind on
 * `127.0.0.1:P` succeeds while another program holds `[::1]:P`, `[::]:P` or
 * `0.0.0.0:P`, and `localhost:P` could then reach that program, so each form is
 * tried in turn with a short-lived bind.
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export async function isPortFreeEverywhere(port) {
  for (const host of PROBE_HOSTS) {
    if (!(await probe(port, host))) return false;
  }
  return true;
}

/** The first value of an `X-Forwarded-Port` header as a port, or null. */
function forwardedPortNumber(value) {
  const first = String(value ?? "").split(",")[0].trim();
  if (!/^\d+$/.test(first)) return null;
  const port = Number(first);
  return port >= 1 && port <= MAX_PORT ? port : null;
}

/**
 * The origin of an `EXPORT_VIEWER_URL`, or null when it isn't an absolute
 * http(s) URL (the setting is then ignored). Only the origin counts: the viewer
 * serves the export with `/` as its root and the start page moves on to
 * path-only destinations, so a path in the setting couldn't be kept past the
 * start page anyway, and a query or fragment would break the start page's URL.
 * electron/viewerOrigins.js applies the same rule; keep the two aligned.
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
 * The viewer's address for one request to the app, or null when it can't be
 * worked out (the caller then serves the export as before).
 *
 * 1. `overrideUrl` (EXPORT_VIEWER_URL), its origin; ignored when unusable.
 * 2. A port defaulted to the app's + 1: the request's protocol and hostname with
 *    the port the browser used plus one, so a remapped or proxied app port maps
 *    to the viewer's (`https://host` on 443 → `https://host:444`). Under trust
 *    proxy a numeric `X-Forwarded-Port` is the port the browser used; Express
 *    itself never reads that header.
 * 3. Otherwise: the request's protocol and hostname with the viewer's own port.
 *
 * @param {{ protocol: string, host: string, forwardedPort?: string, trustProxy: boolean }} request
 *   `host` as Express's `req.host` gives it, port included.
 * @param {{ overrideUrl?: string, viewerPort: number, defaultedFromApp: boolean }} viewer
 * @returns {string|null} an origin, without a trailing slash
 */
export function viewerBase({ protocol, host, forwardedPort, trustProxy }, { overrideUrl, viewerPort, defaultedFromApp }) {
  const override = overrideOrigin(overrideUrl);
  if (override) return override;
  if (!host || (protocol !== "http" && protocol !== "https")) return null;

  let url;
  try {
    // Parsing keeps IPv6 brackets; a Host carrying anything beyond host[:port] is malformed.
    url = new URL(`${protocol}://${host}`);
  } catch {
    return null;
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;

  let port = viewerPort;
  if (defaultedFromApp) {
    const used = (trustProxy && forwardedPortNumber(forwardedPort)) || Number(url.port) || (protocol === "https" ? 443 : 80);
    port = used + 1;
    if (port > MAX_PORT) return null;
  }
  url.port = String(port);
  return url.origin;
}

export class LocalExportViewer {
  #createHandler;
  #env;
  #server = null;
  #port = null;
  #defaultedFromApp = false;
  #current = null;

  /**
   * @param {{ createHandler: (opts: { getCurrent: () => null | { exportRoot: string, sitePath: string } }) => http.RequestListener, env?: Record<string, string|undefined> }} opts
   */
  constructor({ createHandler, env = process.env }) {
    if (typeof createHandler !== "function") throw new Error("LocalExportViewer requires createHandler");
    this.#createHandler = createHandler;
    this.#env = env;
  }

  /**
   * Opens the viewer after the app has bound. Never rejects: when the viewer is
   * off or can't bind it logs why, stays not-ready, and resolves null.
   *
   * Port: a fixed `EXPORT_VIEWER_PORT`; else, when the app's port was asked for,
   * one above it (an OS-assigned port when that one is taken anywhere); else (the
   * app itself is on an OS-assigned port) an OS-assigned port.
   *
   * @param {{ host?: string, appPort: number, appPortWasRequested: boolean }} opts
   * @returns {Promise<{ port: number } | null>}
   */
  async start({ host, appPort, appPortWasRequested }) {
    try {
      const url = this.#env.EXPORT_VIEWER_URL;
      if (url?.trim() && !overrideOrigin(url)) {
        console.warn(`Ignoring EXPORT_VIEWER_URL "${url}": it must be an absolute http:// or https:// URL.`);
      }
      const setting = this.#env.EXPORT_VIEWER_PORT?.trim();
      if (setting === "off") {
        console.log("Export viewer is off (EXPORT_VIEWER_PORT=off); exports are served by the app.");
        return null;
      }

      if (setting) {
        const port = /^\d+$/.test(setting) ? Number(setting) : NaN;
        if (!(port <= MAX_PORT)) {
          console.warn(`Export viewer not started: EXPORT_VIEWER_PORT "${setting}" is not a port or "off".`);
          return null;
        }
        if (port !== 0 && !(await isPortFreeEverywhere(port))) {
          console.warn(`Export viewer not started: port ${port} (EXPORT_VIEWER_PORT) is taken.`);
          return null;
        }
        return await this.#listen(port, host, false);
      }

      const next = appPort + 1;
      if (appPortWasRequested && next <= MAX_PORT && (await isPortFreeEverywhere(next))) {
        try {
          return await this.#listen(next, host, true);
        } catch {
          // Taken between the probe and the bind: an OS-assigned port instead.
        }
      }
      return await this.#listen(0, host, false);
    } catch (err) {
      console.warn(`Export viewer not started: ${err.message}`);
      return null;
    }
  }

  #listen(port, host, defaultedFromApp) {
    return new Promise((resolve, reject) => {
      const server = http.createServer(this.#createHandler({ getCurrent: () => this.#current }));
      server.once("error", reject);
      server.listen(port, host, () => {
        server.off("error", reject);
        this.#server = server;
        this.#port = server.address().port;
        this.#defaultedFromApp = defaultedFromApp;
        resolve({ port: this.#port });
      });
    });
  }

  isReady() {
    return this.#server !== null;
  }

  /** Makes the given export the one the viewer serves. */
  show({ exportRoot, sitePath }) {
    this.#current = { exportRoot, sitePath };
  }

  /**
   * The viewer's origin for this request to the app, or null.
   * @param {import("express").Request} req
   */
  baseUrlFor(req) {
    if (!this.isReady()) return null;
    return viewerBase(
      {
        protocol: req.protocol,
        host: req.host,
        forwardedPort: req.get("x-forwarded-port"),
        trustProxy: Boolean(req.app.get("trust proxy")),
      },
      { overrideUrl: this.#env.EXPORT_VIEWER_URL, viewerPort: this.#port, defaultedFromApp: this.#defaultedFromApp },
    );
  }

  /** The origins a desktop shell lets the viewer load in: loopback forms of the port, plus EXPORT_VIEWER_URL's. */
  origins() {
    const list = this.#port ? [`http://127.0.0.1:${this.#port}`, `http://localhost:${this.#port}`] : [];
    const override = overrideOrigin(this.#env.EXPORT_VIEWER_URL);
    if (override) list.push(override);
    return list;
  }

  async close() {
    const server = this.#server;
    this.#server = null;
    this.#port = null;
    if (server) await new Promise((resolve) => server.close(() => resolve()));
  }
}
