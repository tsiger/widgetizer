import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "node:http";
import net from "node:net";
import express from "express";
import { LocalExportViewer, isPortFreeEverywhere, viewerBase } from "../LocalExportViewer.js";

const FAMILY_ABSENT = new Set(["EADDRNOTAVAIL", "EAFNOSUPPORT"]);

/** Binds a plain TCP server; resolves `{ server, port }`, or `{ error }` when the bind fails. */
function hold(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => resolve({ error }));
    server.listen({ port, host, exclusive: true }, () => resolve({ server, port: server.address().port }));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

/** A port the OS just handed out and released; free at the time of the call. */
async function freePort() {
  const { server, port } = await hold(0, "127.0.0.1");
  await closeServer(server);
  return port;
}

/** A port P whose P + 1 is free, so P can stand for the app's port. */
async function appPortWithFreeNext() {
  for (;;) {
    const next = await freePort();
    if (next > 1 && (await isPortFreeEverywhere(next))) return next - 1;
  }
}

describe("LocalExportViewer.start", () => {
  const cleanups = [];
  let warn;
  let log;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    while (cleanups.length) await cleanups.pop()();
    warn.mockRestore();
    log.mockRestore();
  });

  function viewerWith(env) {
    const viewer = new LocalExportViewer({ createHandler: () => (req, res) => res.end("ok"), env });
    cleanups.push(() => viewer.close());
    return viewer;
  }

  function held(server) {
    cleanups.push(() => closeServer(server));
  }

  it("opens nothing when EXPORT_VIEWER_PORT is off, in any case, and says it is off", async () => {
    for (const off of ["off", "OFF"]) {
      const viewer = viewerWith({ EXPORT_VIEWER_PORT: off });
      expect(await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true })).toBeNull();
      expect(viewer.isReady()).toBe(false);
    }
    expect(warn).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(2);
    expect(String(log.mock.calls[1][0])).toMatch(/Export viewer is off/);
  });

  it("binds a fixed EXPORT_VIEWER_PORT when it is free", async () => {
    const port = await freePort();
    const viewer = viewerWith({ EXPORT_VIEWER_PORT: String(port) });
    expect(await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true })).toEqual({ port });
    expect(viewer.isReady()).toBe(true);
  });

  it("stays not-ready when the fixed port is taken", async () => {
    const { server, port } = await hold(0, "127.0.0.1");
    held(server);
    const viewer = viewerWith({ EXPORT_VIEWER_PORT: String(port) });
    expect(await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true })).toBeNull();
    expect(viewer.isReady()).toBe(false);
  });

  it("binds one above the app's port when it is free", async () => {
    const appPort = await appPortWithFreeNext();
    const viewer = viewerWith({});
    expect(await viewer.start({ host: "127.0.0.1", appPort, appPortWasRequested: true })).toEqual({
      port: appPort + 1,
    });
  });

  for (const blockerHost of ["::1", "::", "0.0.0.0"]) {
    it(`falls back to an OS port when app + 1 is held on ${blockerHost}`, async (ctx) => {
      const blocker = await hold(0, blockerHost);
      if (blocker.error) {
        if (FAMILY_ABSENT.has(blocker.error.code)) return ctx.skip();
        throw blocker.error;
      }
      held(blocker.server);
      const viewer = viewerWith({});
      const result = await viewer.start({ host: "127.0.0.1", appPort: blocker.port - 1, appPortWasRequested: true });
      expect(result).not.toBeNull();
      expect(result.port).not.toBe(blocker.port);
      expect(viewer.isReady()).toBe(true);
    });
  }

  it("takes an OS port when the app is on an OS port", async () => {
    const appPort = await appPortWithFreeNext();
    const viewer = viewerWith({});
    const result = await viewer.start({ host: "127.0.0.1", appPort, appPortWasRequested: false });
    expect(result.port).toBeGreaterThan(0);
    // The OS may hand out app + 1 itself; what matters is that the port isn't
    // treated as defaulted, so the address uses the viewer's own port.
    const req = { protocol: "http", host: "localhost:8080", get: () => undefined, app: { get: () => false } };
    expect(viewer.baseUrlFor(req)).toBe(`http://localhost:${result.port}`);
  });

  it("warns once at start about an EXPORT_VIEWER_URL it can't use, and still starts", async () => {
    const viewer = viewerWith({ EXPORT_VIEWER_PORT: "0", EXPORT_VIEWER_URL: "ftp://view.example.com" });
    expect(await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true })).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/EXPORT_VIEWER_URL/);
  });

  it("warns once at start that a path, query or fragment in EXPORT_VIEWER_URL is dropped", async () => {
    const viewer = viewerWith({ EXPORT_VIEWER_PORT: "0", EXPORT_VIEWER_URL: "https://host.example.com/view/" });
    expect(await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true })).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/only its origin.*https:\/\/host\.example\.com/);
  });

  it("doesn't warn about an EXPORT_VIEWER_URL that is just an origin, with or without a trailing slash", async () => {
    for (const url of ["https://view.example.com", "https://view.example.com/"]) {
      const viewer = viewerWith({ EXPORT_VIEWER_PORT: "0", EXPORT_VIEWER_URL: url });
      expect(await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true })).not.toBeNull();
      await viewer.close();
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it("never rejects, even when the bind host is unusable", async () => {
    const viewer = viewerWith({ EXPORT_VIEWER_PORT: "0" });
    await expect(
      viewer.start({ host: "256.256.256.256", appPort: 3001, appPortWasRequested: true }),
    ).resolves.toBeNull();
    expect(viewer.isReady()).toBe(false);
  });

  it("stays not-ready for an EXPORT_VIEWER_PORT that is not a port", async () => {
    const viewer = viewerWith({ EXPORT_VIEWER_PORT: "abc" });
    expect(await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true })).toBeNull();
  });

  it("serves the handler built from createHandler, which reads the shown export", async () => {
    let getCurrent;
    const viewer = new LocalExportViewer({
      createHandler: (opts) => {
        getCurrent = opts.getCurrent;
        return (req, res) => res.end(JSON.stringify(getCurrent()));
      },
      env: { EXPORT_VIEWER_PORT: "0" },
    });
    cleanups.push(() => viewer.close());
    const { port } = await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true });
    expect(getCurrent()).toBeNull();
    viewer.show({ exportDir: "p/v1", exportRoot: "/data/p/v1", sitePath: "/repo/" });
    const body = await new Promise((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port, path: "/" }, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        })
        .on("error", reject);
    });
    expect(JSON.parse(body)).toEqual({ exportRoot: "/data/p/v1", sitePath: "/repo/" });
  });

  it("is not ready after close", async () => {
    const viewer = viewerWith({ EXPORT_VIEWER_PORT: "0" });
    await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true });
    await viewer.close();
    expect(viewer.isReady()).toBe(false);
  });
});

describe("isPortFreeEverywhere", () => {
  it("is true for a free port and false for one held on 127.0.0.1", async () => {
    const { server, port } = await hold(0, "127.0.0.1");
    try {
      expect(await isPortFreeEverywhere(port)).toBe(false);
    } finally {
      await closeServer(server);
    }
    expect(await isPortFreeEverywhere(await freePort())).toBe(true);
  });
});

describe("viewerBase", () => {
  const defaulted = { overrideUrl: undefined, viewerPort: 3002, defaultedFromApp: true };
  const req = (over) => ({ protocol: "http", host: "localhost:3001", forwardedPort: undefined, trustProxy: false, ...over });

  it("uses EXPORT_VIEWER_URL's origin", () => {
    const over = (overrideUrl) => viewerBase(req(), { ...defaulted, overrideUrl });
    expect(over("https://view.example.com")).toBe("https://view.example.com");
    expect(over("https://view.example.com/")).toBe("https://view.example.com");
    expect(over("http://view.example.com:8081/x/?a=1#b")).toBe("http://view.example.com:8081");
  });

  it("ignores an EXPORT_VIEWER_URL that isn't an absolute http(s) URL", () => {
    for (const overrideUrl of ["view.example.com", "view.example.com:8081", "ftp://view.example.com", "/view", " "]) {
      expect(viewerBase(req(), { ...defaulted, overrideUrl }), overrideUrl).toBe("http://localhost:3002");
    }
  });

  it("adds one to the port the browser used when the viewer port was defaulted", () => {
    expect(viewerBase(req(), defaulted)).toBe("http://localhost:3002");
    expect(viewerBase(req({ host: "localhost:8080" }), defaulted)).toBe("http://localhost:8081");
  });

  it("reads an empty port as the protocol's default", () => {
    expect(viewerBase(req({ protocol: "https", host: "builder.example.com" }), defaulted)).toBe(
      "https://builder.example.com:444",
    );
    expect(viewerBase(req({ host: "builder.example.com" }), defaulted)).toBe("http://builder.example.com:81");
  });

  it("uses a trusted X-Forwarded-Port (its first numeric value)", () => {
    const https = { protocol: "https", host: "builder.example.com", trustProxy: true };
    expect(viewerBase(req({ ...https, forwardedPort: "8443" }), defaulted)).toBe("https://builder.example.com:8444");
    expect(viewerBase(req({ ...https, forwardedPort: "8443, 9443" }), defaulted)).toBe(
      "https://builder.example.com:8444",
    );
    expect(viewerBase(req({ ...https, forwardedPort: "abc" }), defaulted)).toBe("https://builder.example.com:444");
  });

  it("ignores X-Forwarded-Port without trust proxy", () => {
    expect(viewerBase(req({ forwardedPort: "8443" }), defaulted)).toBe("http://localhost:3002");
  });

  it("keeps IPv6 brackets", () => {
    expect(viewerBase(req({ host: "[::1]:3001" }), defaulted)).toBe("http://[::1]:3002");
  });

  it("returns null for a malformed host", () => {
    expect(viewerBase(req({ host: "exa mple.com" }), defaulted)).toBeNull();
    expect(viewerBase(req({ host: "" }), defaulted)).toBeNull();
    expect(viewerBase(req({ host: "example.com/path" }), defaulted)).toBeNull();
  });

  it("uses the viewer's actual port when it was not defaulted", () => {
    const fixed = { overrideUrl: undefined, viewerPort: 4567, defaultedFromApp: false };
    expect(viewerBase(req({ host: "localhost:8080" }), fixed)).toBe("http://localhost:4567");
    expect(viewerBase(req({ protocol: "https", host: "builder.example.com" }), fixed)).toBe(
      "https://builder.example.com:4567",
    );
  });
});

describe("LocalExportViewer.origins", () => {
  it("lists the loopback origins and the override's origin", async () => {
    const port = await freePort();
    const viewer = new LocalExportViewer({
      createHandler: () => (req, res) => res.end(),
      env: { EXPORT_VIEWER_PORT: String(port), EXPORT_VIEWER_URL: "https://view.example.com/x" },
    });
    try {
      await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true });
      expect(viewer.origins()).toEqual([
        `http://127.0.0.1:${port}`,
        `http://localhost:${port}`,
        "https://view.example.com",
      ]);
    } finally {
      await viewer.close();
    }
  });
});

describe("LocalExportViewer.origins with an unusable EXPORT_VIEWER_URL", () => {
  it("leaves it out", async () => {
    for (const url of ["view.example.com", "ftp://view.example.com"]) {
      const viewer = new LocalExportViewer({
        createHandler: () => (req, res) => res.end(),
        env: { EXPORT_VIEWER_PORT: "0", EXPORT_VIEWER_URL: url },
      });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const { port } = await viewer.start({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true });
        expect(viewer.origins(), url).toEqual([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
      } finally {
        warn.mockRestore();
        await viewer.close();
      }
    }
  });
});

describe("LocalExportViewer.baseUrlFor through Express", () => {
  const cleanups = [];
  afterEach(async () => {
    while (cleanups.length) await cleanups.pop()();
  });

  /** Starts a defaulted viewer and an Express app answering with `baseUrlFor(req)`. */
  async function setup({ trustProxy }) {
    const appPort = await appPortWithFreeNext();
    const viewer = new LocalExportViewer({ createHandler: () => (req, res) => res.end(), env: {} });
    cleanups.push(() => viewer.close());
    await viewer.start({ host: "127.0.0.1", appPort, appPortWasRequested: true });

    const app = express();
    if (trustProxy) app.set("trust proxy", 1);
    app.get("/base", (req, res) => res.json({ base: viewer.baseUrlFor(req) }));
    const server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    cleanups.push(() => closeServer(server));

    return (headers) =>
      new Promise((resolve, reject) => {
        http
          .get({ host: "127.0.0.1", port: server.address().port, path: "/base", headers, agent: false }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(JSON.parse(data).base));
          })
          .on("error", reject);
      });
  }

  const proxied = {
    Host: "widgetizer:3001",
    "X-Forwarded-Host": "builder.example.com",
    "X-Forwarded-Proto": "https",
  };

  it("reads the public address from the proxy headers under trust proxy", async () => {
    const base = await setup({ trustProxy: true });
    expect(await base(proxied)).toBe("https://builder.example.com:444");
    expect(await base({ ...proxied, "X-Forwarded-Port": "8443" })).toBe("https://builder.example.com:8444");
  });

  it("ignores the proxy headers without trust proxy", async () => {
    const base = await setup({ trustProxy: false });
    expect(await base({ ...proxied, "X-Forwarded-Port": "8443" })).toBe("http://widgetizer:3002");
    expect(await base({ Host: "localhost:8080" })).toBe("http://localhost:8081");
  });
});
