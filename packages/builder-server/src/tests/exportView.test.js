/**
 * Export viewer path resolution (routes/export.js#resolveExportFile): the
 * extensionless fallbacks a Clean-URLs export needs, and containment to the
 * selected export directory. Pure function over a tmp publish dir.
 *
 * Run with: node --test packages/builder-server/src/tests/exportView.test.js
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-exportview-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { resolveExportFile } = await import("../routes/export.js");

const PUBLISH = path.join(TEST_ROOT, "publish");
const DIR = "site-v1";
const root = path.join(PUBLISH, DIR);

before(async () => {
  await fs.outputFile(path.join(root, "index.html"), "home");
  await fs.outputFile(path.join(root, "about.html"), "about");
  await fs.outputFile(path.join(root, "blog.html"), "blog-flat");
  await fs.outputFile(path.join(root, "blog", "index.html"), "blog-index");
  await fs.outputFile(path.join(root, "docs", "index.html"), "docs-index");
  await fs.outputFile(path.join(root, "rooms", "suite.html"), "suite");
  await fs.outputFile(path.join(root, "assets", "site.css"), "css");
  await fs.outputFile(path.join(root, "assets", "raw"), "raw");
  await fs.outputFile(path.join(PUBLISH, "other-v1", "secret.html"), "secret");
  // A sibling FILE of the export root, one character away from it: the
  // `<base>.html` fallback for a request that lands on the root itself.
  await fs.outputFile(path.join(PUBLISH, `${DIR}.html`), "sibling");
});
after(() => fs.remove(TEST_ROOT));

const r = (req) => resolveExportFile(PUBLISH, DIR, req);

describe("resolveExportFile", () => {
  it("serves exact files and the root index", () => {
    assert.equal(r("index.html"), path.join(root, "index.html"));
    assert.equal(r("about.html"), path.join(root, "about.html"));
    assert.equal(r("assets/site.css"), path.join(root, "assets", "site.css"));
  });
  it("resolves extensionless page and item requests to <path>.html", () => {
    assert.equal(r("about"), path.join(root, "about.html"));
    assert.equal(r("rooms/suite"), path.join(root, "rooms", "suite.html"));
  });
  it("exact extensionless file wins over any fallback", () => {
    assert.equal(r("assets/raw"), path.join(root, "assets", "raw"));
  });
  it("flat <path>.html beats <path>/index.html; a lone directory index still serves", () => {
    assert.equal(r("blog"), path.join(root, "blog.html"));
    assert.equal(r("docs"), path.join(root, "docs", "index.html"));
  });
  it("trailing slash: the flat file wins, then the directory index", () => {
    assert.equal(r("blog/"), path.join(root, "blog.html"));
    assert.equal(r("docs/"), path.join(root, "docs", "index.html"));
    assert.equal(r("about/"), path.join(root, "about.html"));
    assert.equal(r("rooms/suite/"), path.join(root, "rooms", "suite.html"));
  });
  it("returns null for missing paths in every shape", () => {
    assert.equal(r("missing"), null);
    assert.equal(r("missing.html"), null);
    assert.equal(r("missing/"), null);
  });
  it("never serves the <root>.html sibling for a request that lands on the export root", () => {
    const sibling = path.join(PUBLISH, `${DIR}.html`);
    assert.equal(fs.existsSync(sibling), true, "fixture sibling exists");
    // Every request shape whose base resolves to the export root itself: the
    // `<base>.html` fallback would be the sibling, so containment drops it and
    // the root index (or nothing) answers instead.
    assert.equal(r("./"), path.join(root, "index.html"));
    assert.equal(r(""), path.join(root, "index.html"));
    assert.equal(r("rooms/../"), path.join(root, "index.html"));
    assert.equal(r("."), null);
    assert.equal(r("rooms/.."), null);
    for (const req of ["./", "", "rooms/../", ".", "rooms/..", "../site-v1.html", "../site-v1"]) {
      assert.notEqual(r(req), sibling, `request ${JSON.stringify(req)} must never reach the sibling`);
    }
  });
  it("never resolves outside the selected export — sibling exports and the publish root included", () => {
    assert.equal(r("../other-v1/secret.html"), null);
    assert.equal(r("../other-v1/secret"), null);
    assert.equal(r("../../etc/passwd"), null);
    assert.equal(r("rooms/../../other-v1/secret.html"), null);
  });
});
