/**
 * The library entry offers the pieces an embedding app builds on, as the same
 * objects the mounted routes use: the content-write section above all, which
 * only orders writes when there is one of it.
 *
 * Run with: node --test packages/builder-server/src/tests/publicExports.test.js
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-public-exports-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const barrel = await import("../index.js");
const modules = {
  contentCoordination: await import("../services/contentCoordination.js"),
  mediaUsage: await import("../services/mediaUsageService.js"),
  sanitization: await import("../services/sanitizationService.js"),
  contentLanguage: await import("../utils/contentLanguage.js"),
  siteStrings: await import("../services/siteStringsService.js"),
  collections: await import("../services/collectionService.js"),
  themeUpdates: await import("../services/themeUpdateService.js"),
  themeSeeds: await import("../utils/themeSeedRoots.js"),
  themeReads: await import("../utils/themeReads.js"),
  siteIdentityInput: await import("../services/siteIdentityInput.js"),
  presetMedia: await import("../services/presetMedia.js"),
};

after(() => fs.remove(TEST_ROOT));

describe("library entry", () => {
  it("offers each piece as the same object its own module has", () => {
    const expected = {
      withContentWriteLock: modules.contentCoordination,
      assertIntroducedMediaExists: modules.contentCoordination,
      extractMediaPathsFromThemeSettings: modules.mediaUsage,
      extractMediaPathsFromSiteIdentity: modules.mediaUsage,
      updateSiteIdentityMediaUsage: modules.mediaUsage,
      stripHtmlToText: modules.sanitization,
      projectLanguages: modules.contentLanguage,
      loadSiteStrings: modules.siteStrings,
      readCollectionItem: modules.collections,
      hasInterruptedThemeUpdate: modules.themeUpdates,
      listSeedThemeIds: modules.themeSeeds,
      resolveSeedThemeDir: modules.themeSeeds,
      injectThemeReads: modules.themeReads,
      readSiteIdentity: modules.siteIdentityInput,
      registerPresetMedia: modules.presetMedia,
    };
    for (const [name, module] of Object.entries(expected)) {
      assert.equal(typeof barrel[name], "function", name);
      assert.equal(barrel[name], module[name], name);
    }
  });

  it("keeps the test seams and the database layer out of it", () => {
    for (const name of ["recordDeletedMediaPaths", "clearDeletedMediaPaths", "addMediaFile", "readerFor"]) {
      assert.equal(barrel[name], undefined, name);
    }
  });

  it("orders writes through the one content-write section the routes use", async () => {
    const order = [];
    let release;
    const first = modules.contentCoordination.withContentWriteLock("p1", async () => {
      order.push("route write starts");
      await new Promise((resolve) => (release = resolve));
      order.push("route write ends");
    });
    const second = barrel.withContentWriteLock("p1", async () => order.push("embedding write"));
    await new Promise((resolve) => setImmediate(resolve));
    release();
    await Promise.all([first, second]);
    assert.deepEqual(order, ["route write starts", "route write ends", "embedding write"]);
  });
});

describe("hasInterruptedThemeUpdate", () => {
  it("says whether an interrupted update's plan is in the project", async () => {
    const projectDir = path.join(TEST_ROOT, "project");
    await fs.ensureDir(projectDir);
    assert.equal(await barrel.hasInterruptedThemeUpdate(projectDir), false);
    await fs.outputFile(path.join(projectDir, ".theme-update-backup", ".in-progress"), "{}");
    assert.equal(await barrel.hasInterruptedThemeUpdate(projectDir), true);
  });
});

describe("injectThemeReads", () => {
  it("embeds the reads as JSON before </body>, with < escaped", () => {
    const html = barrel.injectThemeReads("<html><body><p>x</p></body></html>", { widgets: { w1: ["a</script>"] } });
    assert.match(html, /<script type="application\/json" id="widgetizer-theme-reads">\{.*\}<\/script>\n<\/body>/);
    assert.ok(html.includes("\\u003c/script>"));
    assert.equal(html.match(/<\/script>/g).length, 1);
  });
});
