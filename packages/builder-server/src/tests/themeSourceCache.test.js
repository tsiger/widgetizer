/**
 * Theme source cache test suite.
 *
 * Pins getCachedThemeValue's invalidation contract: deleting a cache entry
 * (what invalidateThemeSourceCache does) must stick, even when a loader was
 * already in flight — a late-resolving load must neither repopulate the
 * invalidated entry nor overwrite a newer one.
 *
 * Run with: node --test packages/builder-server/src/tests/themeSourceCache.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-cache-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getCachedThemeValue } = await import("../controllers/themeController.js");

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

describe("getCachedThemeValue invalidation", () => {
  it("caches a loaded value and reuses it without re-running the loader", async () => {
    const cache = new Map();
    let calls = 0;
    const loader = async () => {
      calls++;
      return "value";
    };

    assert.equal(await getCachedThemeValue(cache, "k", loader), "value");
    assert.equal(await getCachedThemeValue(cache, "k", loader), "value");
    assert.equal(calls, 1);
  });

  it("an invalidated in-flight load does not repopulate the cache", async () => {
    const cache = new Map();
    const load = deferred();

    const pending = getCachedThemeValue(cache, "k", () => load.promise);
    cache.delete("k"); // what invalidateThemeSourceCache does mid-flight
    load.resolve("stale");

    // The original caller still gets its value…
    assert.equal(await pending, "stale");
    // …but the invalidated entry must stay gone, not be resurrected for a TTL.
    assert.equal(cache.has("k"), false);
  });

  it("a late load does not overwrite the entry of a newer load", async () => {
    const cache = new Map();
    const slow = deferred();

    const first = getCachedThemeValue(cache, "k", () => slow.promise);
    cache.delete("k"); // invalidation between the two loads
    assert.equal(await getCachedThemeValue(cache, "k", async () => "fresh"), "fresh");

    slow.resolve("stale");
    assert.equal(await first, "stale");

    assert.equal(await getCachedThemeValue(cache, "k", async () => "unused"), "fresh");
  });
});
