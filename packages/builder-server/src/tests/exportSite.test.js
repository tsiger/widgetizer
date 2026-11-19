/**
 * The export site app (services/exportSite.js): serves the current export with
 * its site path as the root, plus the start page that clears the viewer
 * origin's storage before moving on. Listener-free; the tests serve it on an
 * OS-assigned loopback port.
 *
 * Run with: node --test packages/builder-server/src/tests/exportSite.test.js
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import http from "node:http";
import path from "node:path";
import os from "node:os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-exportsite-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { createExportSiteApp, startDestination, START_PATH } = await import("../services/exportSite.js");
const barrel = await import("../index.js");

const PUBLISH = path.join(TEST_ROOT, "publish");
const SITE = path.join(PUBLISH, "site-v1");
const SITE2 = path.join(PUBLISH, "site-v2");
const BARE = path.join(PUBLISH, "bare-v1");
const DOT_PUBLISH = path.join(TEST_ROOT, ".config", "Widgetizer", "data", "publish");
const DOT_SITE = path.join(DOT_PUBLISH, "dot-v1");
const OUTSIDE = path.join(TEST_ROOT, "outside");
const LINKED = path.join(PUBLISH, "linked-v1");
// An export reached through a symlinked folder, as a data dir under a linked
// path would be (macOS's /var → /private/var is one).
const REAL_PARENT = path.join(TEST_ROOT, "real-parent");
const LINK_PARENT = path.join(TEST_ROOT, "link-parent");
const VIA_LINK = path.join(LINK_PARENT, "via-link-v1");

let current = null;
const servers = [];

async function serve(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

/** A request with the path sent exactly as written (fetch normalizes `..`). */
function rawRequest(base, rawPath, { method = "GET", headers = {} } = {}) {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path: rawPath, method, headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

let base;

before(async () => {
  await fs.outputFile(path.join(SITE, "index.html"), "<p>home</p>");
  await fs.outputFile(path.join(SITE, "about.html"), "<p>about</p>");
  await fs.outputFile(path.join(SITE, "blog", "index.html"), "<p>blog</p>");
  await fs.outputFile(path.join(SITE, "assets", "site.css"), "body{}");
  await fs.outputFile(path.join(SITE, "404.html"), "<p>root 404</p>");
  await fs.outputFile(path.join(SITE, "el", "index.html"), "<p>el home</p>");
  await fs.outputFile(path.join(SITE, "el", "404.html"), "<p>el 404</p>");
  await fs.outputFile(path.join(SITE, "de", "index.html"), "<p>de home</p>");
  await fs.outputFile(path.join(SITE, ".hidden"), "secret-dotfile");
  await fs.outputFile(path.join(SITE2, "index.html"), "<p>second</p>");
  await fs.outputFile(path.join(BARE, "index.html"), "<p>bare</p>");
  // Beside the exports, never to be served.
  await fs.outputFile(path.join(PUBLISH, "other-v1", "secret.html"), "TOP-SECRET");
  await fs.outputFile(path.join(PUBLISH, "404.html"), "PUBLISH-404");
  await fs.outputFile(path.join(DOT_SITE, "index.html"), "<p>dot home</p>");
  await fs.outputFile(path.join(DOT_SITE, ".hidden"), "dot-secret");

  await fs.outputFile(path.join(OUTSIDE, "secret.html"), "OUTSIDE-SECRET");
  await fs.outputFile(path.join(OUTSIDE, "404.html"), "OUTSIDE-404");
  await fs.outputFile(path.join(LINKED, "index.html"), "<p>linked home</p>");
  await fs.outputFile(path.join(LINKED, "404.html"), "<p>linked 404</p>");
  await fs.ensureDir(path.join(LINKED, "assets"));
  await fs.symlink(path.join(OUTSIDE, "secret.html"), path.join(LINKED, "assets", "secret.html"));
  await fs.symlink(OUTSIDE, path.join(LINKED, "assets", "outside"), "dir");
  await fs.symlink("index.html", path.join(LINKED, "same.html"));
  await fs.outputFile(path.join(REAL_PARENT, "via-link-v1", "index.html"), "<p>via link home</p>");
  await fs.outputFile(path.join(REAL_PARENT, "via-link-v1", "404.html"), "<p>via link 404</p>");
  await fs.symlink(REAL_PARENT, LINK_PARENT, "dir");

  base = await serve(createExportSiteApp({ getCurrent: () => current }));
});

after(async () => {
  await Promise.all(servers.map((s) => new Promise((resolve) => s.close(resolve))));
  await fs.remove(TEST_ROOT);
});

const ORIGINS = ["http://127.0.0.1:3002", "https://builder.example.com:444"];

function assertStaysOn(result, label) {
  for (const o of ORIGINS) assert.equal(new URL(result, o).origin, o, `${label} on ${o}`);
}

describe("startDestination", () => {
  it("keeps a same-origin destination as a parsed path", () => {
    assert.equal(startDestination("/about.html", "/"), "/about.html");
    assert.equal(startDestination("/repo/x?a=1#s", "/repo/"), "/repo/x?a=1#s");
    assert.equal(startDestination("/a b", "/"), "/a%20b");
    assertStaysOn(startDestination("/repo/x?a=1#s", "/repo/"), "kept");
  });

  it("falls back to the site path for anything off the viewer origin or malformed", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "http://evil.com/", "https://evil.com/x", "/a\u0000b", "/a\nb", undefined]) {
      const result = startDestination(bad, "/repo/");
      assert.equal(result, "/repo/", String(bad));
      assertStaysOn(result, String(bad));
    }
  });

  it("keeps a same-origin path that starts with // on the viewer", () => {
    const result = startDestination("/.//other.example/x", "/");
    assert.equal(result, "/.//other.example/x");
    assertStaysOn(result, "dot-guarded");
  });

  it("builds the fallback as a path, never as a reference", () => {
    const result = startDestination("//evil.com", "//other.example/");
    assert.equal(result, "/.//other.example/");
    assertStaysOn(result, "//host site path");
    for (const o of ORIGINS) assert.equal(new URL(result, o).href, `${o}//other.example/`);
  });

  it("ends the site path with a slash", () => {
    assert.equal(startDestination(undefined, "/repo"), "/repo/");
    assert.equal(startDestination(undefined, ""), "/");
  });

  it("is exported from the library entry", () => {
    assert.equal(barrel.createExportSiteApp, createExportSiteApp);
    assert.equal(barrel.startDestination, startDestination);
    assert.equal(barrel.START_PATH, START_PATH);
    assert.equal(START_PATH, "/__widgetizer/view-start");
  });
});

describe("start page", () => {
  before(() => {
    current = { exportRoot: SITE, sitePath: "/" };
  });

  it("answers 200, clears storage only, and moves on to the parsed destination", async () => {
    const res = await fetch(`${base}${START_PATH}?to=%2Fabout.html`, { redirect: "manual" });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("clear-site-data"), '"storage"');
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(res.headers.get("content-type"), /^text\/html/);
    const body = await res.text();
    const dest = "/about.html";
    assert.ok(body.includes(`<meta http-equiv="refresh" content="0;url=${dest}">`), body);
    assert.ok(body.includes(`var to = ${JSON.stringify(dest)};`), body);
    assert.ok(body.includes("location.replace("), body);
    assert.ok(body.includes("location.hash"), body);
  });

  it("keeps the View URL's fragment only when the destination has none", async () => {
    const res = await fetch(`${base}${START_PATH}?to=%2Fabout.html%23top`);
    const body = await res.text();
    assert.ok(body.includes(`var to = ${JSON.stringify("/about.html#top")};`), body);
    assert.match(body, /to\.indexOf\("#"\) < 0/);
  });

  it("escapes the destination in the markup and the script", async () => {
    const to = encodeURIComponent(`/a?q="><script>x</script>&b='1'`);
    const body = await (await fetch(`${base}${START_PATH}?to=${to}`)).text();
    assert.doesNotMatch(body, /<script>x<\/script>/);
    const metaUrl = body.match(/content="0;url=([^"]*)"/)[1];
    assert.doesNotMatch(metaUrl, /[<>"']/);
    const scriptTo = body.match(/var to = (".*?");/)[1];
    assert.doesNotMatch(scriptTo, /</);
    assertStaysOn(JSON.parse(scriptTo), "escaped");
  });

  it("refuses a cross-origin `to` in favour of the site path", async () => {
    const body = await (await fetch(`${base}${START_PATH}?to=${encodeURIComponent("//evil.com/x")}`)).text();
    assert.ok(body.includes(`var to = ${JSON.stringify("/")};`), body);
    assert.doesNotMatch(body, /evil\.com/);
  });
});

describe("serving with site path /", () => {
  before(() => {
    current = { exportRoot: SITE, sitePath: "/" };
  });

  it("follows resolveExportFile's rules", async () => {
    for (const [p, body, type] of [
      ["/", "<p>home</p>", /^text\/html/],
      ["/about", "<p>about</p>", /^text\/html/],
      ["/about.html", "<p>about</p>", /^text\/html/],
      ["/blog/", "<p>blog</p>", /^text\/html/],
      ["/assets/site.css", "body{}", /^text\/css/],
      ["/404.html", "<p>root 404</p>", /^text\/html/],
    ]) {
      const res = await fetch(base + p);
      assert.equal(res.status, 200, p);
      assert.match(res.headers.get("content-type"), type, p);
      assert.equal(await res.text(), body, p);
    }
  });

  it("answers a miss with the nearest 404.html and status 404", async () => {
    for (const [p, body] of [
      ["/missing", "<p>root 404</p>"],
      ["/el/missing", "<p>el 404</p>"],
      ["/el/deeper/missing/", "<p>el 404</p>"],
      ["/de/missing", "<p>root 404</p>"],
    ]) {
      const res = await fetch(base + p);
      assert.equal(res.status, 404, p);
      assert.match(res.headers.get("content-type"), /^text\/html/, p);
      assert.equal(await res.text(), body, p);
    }
  });

  it("answers a plain 404 when the export has no 404.html", async () => {
    current = { exportRoot: BARE, sitePath: "/" };
    try {
      const res = await fetch(`${base}/missing`);
      assert.equal(res.status, 404);
      assert.match(res.headers.get("content-type"), /^text\/plain/);
      assert.doesNotMatch(await res.text(), /404<\/p>|PUBLISH-404/);
    } finally {
      current = { exportRoot: SITE, sitePath: "/" };
    }
  });

  it("refuses methods other than GET and HEAD", async () => {
    for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
      const res = await fetch(`${base}/`, { method });
      assert.equal(res.status, 405, method);
      assert.equal(res.headers.get("cache-control"), "no-store", method);
    }
    const head = await fetch(`${base}/about`, { method: "HEAD" });
    assert.equal(head.status, 200);
  });

  it("sends no-store and no CORS headers on every response", async () => {
    for (const p of ["/", "/about", "/missing", "/el/missing", `${START_PATH}?to=%2F`, "/assets/site.css"]) {
      const res = await fetch(base + p, { redirect: "manual", headers: { Origin: "http://evil.example" } });
      assert.equal(res.headers.get("cache-control"), "no-store", p);
      assert.equal(res.headers.get("access-control-allow-origin"), null, p);
    }
  });

  it("keeps requests inside the export", async () => {
    for (const p of [
      "/../other-v1/secret.html",
      "/..%2fother-v1%2fsecret.html",
      "/%2e%2e/other-v1/secret.html",
      "/el/..%2f..%2fother-v1/x",
      "/el/..%2f..%2f404.html",
      "/..%5cother-v1%5csecret.html",
    ]) {
      const res = await rawRequest(base, p);
      assert.notEqual(res.status, 200, p);
      assert.doesNotMatch(res.body, /TOP-SECRET|PUBLISH-404/, p);
    }
  });

  it("refuses a dot-file inside the export", async () => {
    const res = await fetch(`${base}/.hidden`);
    assert.equal(res.status, 404);
    assert.doesNotMatch(await res.text(), /secret-dotfile/);
  });
});

describe("symlinks in the export", () => {
  before(() => {
    current = { exportRoot: LINKED, sitePath: "/" };
  });

  it("refuses a linked file that points outside the export", async () => {
    const res = await fetch(`${base}/assets/secret.html`);
    assert.equal(res.status, 404);
    assert.doesNotMatch(await res.text(), /OUTSIDE-SECRET/);
  });

  it("refuses a linked folder that points outside, for its files and its 404.html", async () => {
    const file = await fetch(`${base}/assets/outside/secret.html`);
    assert.equal(file.status, 404);
    assert.doesNotMatch(await file.text(), /OUTSIDE-SECRET/);

    const miss = await fetch(`${base}/assets/outside/missing`);
    assert.equal(miss.status, 404);
    assert.equal(await miss.text(), "<p>linked 404</p>");
  });

  it("serves a link to another file inside the export", async () => {
    const res = await fetch(`${base}/same.html`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "<p>linked home</p>");
  });

  it("serves an export whose own path runs through a symlinked folder", async () => {
    current = { exportRoot: VIA_LINK, sitePath: "/" };
    try {
      const home = await fetch(`${base}/`);
      assert.equal(home.status, 200);
      assert.equal(await home.text(), "<p>via link home</p>");
      const miss = await fetch(`${base}/missing`);
      assert.equal(miss.status, 404);
      assert.equal(await miss.text(), "<p>via link 404</p>");
    } finally {
      current = { exportRoot: LINKED, sitePath: "/" };
    }
  });
});

describe("export under a dot-folder", () => {
  it("serves the export and still refuses a dot-file in it", async () => {
    current = { exportRoot: DOT_SITE, sitePath: "/" };
    try {
      const home = await fetch(`${base}/`);
      assert.equal(home.status, 200);
      assert.equal(await home.text(), "<p>dot home</p>");
      const hidden = await fetch(`${base}/.hidden`);
      assert.equal(hidden.status, 404);
      assert.doesNotMatch(await hidden.text(), /dot-secret/);
    } finally {
      current = null;
    }
  });
});

describe("serving with a site path", () => {
  it("redirects / to the site path on the viewer origin and serves under it", async () => {
    current = { exportRoot: SITE, sitePath: "/repo/" };
    const root = await fetch(`${base}/`, { redirect: "manual" });
    assert.equal(root.status, 302);
    assert.equal(root.headers.get("location"), "/repo/");
    assert.equal(root.headers.get("cache-control"), "no-store");

    const about = await fetch(`${base}/repo/about.html`);
    assert.equal(about.status, 200);
    assert.equal(await about.text(), "<p>about</p>");

    const home = await fetch(`${base}/repo/`);
    assert.equal(home.status, 200);
    assert.equal(await home.text(), "<p>home</p>");

    const missing = await fetch(`${base}/repo/el/missing`);
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), "<p>el 404</p>");

    const outside = await fetch(`${base}/other/x`);
    assert.equal(outside.status, 404);
    assert.match(outside.headers.get("content-type"), /^text\/plain/);
    assert.doesNotMatch(await outside.text(), /404<\/p>/);
  });

  it("keeps a //host-shaped site path on the viewer origin", async () => {
    current = { exportRoot: SITE, sitePath: "//other.example/" };
    const res = await fetch(`${base}/`, { redirect: "manual" });
    assert.equal(res.status, 302);
    const location = res.headers.get("location");
    assert.equal(location, "/.//other.example/");
    assert.equal(new URL(location, base).origin, base);
  });

  it("redirects the site path without its trailing slash, keeping the query", async () => {
    current = { exportRoot: SITE, sitePath: "/repo/" };
    const res = await fetch(`${base}/repo?preview=1`, { redirect: "manual" });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/repo/?preview=1");
  });

  it("keeps the query when redirecting / to the site path", async () => {
    current = { exportRoot: SITE, sitePath: "/repo/" };
    const res = await fetch(`${base}/?x=1`, { redirect: "manual" });
    assert.equal(res.headers.get("location"), "/repo/?x=1");

    current = { exportRoot: SITE, sitePath: "//other.example/" };
    const dotted = await fetch(`${base}/?x=1`, { redirect: "manual" });
    const location = dotted.headers.get("location");
    assert.equal(location, "/.//other.example/?x=1");
    assert.equal(new URL(location, base).origin, base);
  });

  it("treats a site path without a trailing slash as a folder", async () => {
    current = { exportRoot: SITE, sitePath: "/repo" };
    const outside = await fetch(`${base}/repository/about.html`);
    assert.equal(outside.status, 404);
    assert.doesNotMatch(await outside.text(), /about/);
    const inside = await fetch(`${base}/repo/about.html`);
    assert.equal(inside.status, 200);
    const root = await fetch(`${base}/`, { redirect: "manual" });
    assert.equal(root.headers.get("location"), "/repo/");
  });

  it("serves a URL-encoded site path (spaces, non-ASCII)", async () => {
    for (const sitePath of ["/%CE%B1%CE%B2/", "/my%20repo/"]) {
      current = { exportRoot: SITE, sitePath };
      const root = await fetch(`${base}/`, { redirect: "manual" });
      assert.equal(root.status, 302, sitePath);
      const location = root.headers.get("location");
      assert.equal(location, sitePath);
      const home = await fetch(new URL(location, base));
      assert.equal(home.status, 200, sitePath);
      assert.equal(await home.text(), "<p>home</p>", sitePath);
      const about = await fetch(new URL(`${location}about`, base));
      assert.equal(about.status, 200, sitePath);
      const lower = await fetch(new URL(`${location.toLowerCase()}about.html`, base));
      assert.equal(lower.status, 200, `${sitePath} lowercase escapes`);
    }
  });
});

describe("current export", () => {
  it("answers 404 with a short page when no export is chosen", async () => {
    current = null;
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(await res.text(), /Open an export from the Export page/);
  });

  it("serves the newly chosen export on the next request", async () => {
    current = { exportRoot: SITE, sitePath: "/" };
    assert.equal(await (await fetch(`${base}/`)).text(), "<p>home</p>");
    current = { exportRoot: SITE2, sitePath: "/" };
    assert.equal(await (await fetch(`${base}/`)).text(), "<p>second</p>");
  });
});
