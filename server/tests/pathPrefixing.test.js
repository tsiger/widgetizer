/**
 * Phase 15 — depth-aware asset/tag path prefixing.
 *
 * Every asset-emitting tag, in publish mode, must prepend `outputPathPrefix`
 * (the per-render global: "" at the export root, "../" one directory deep) to
 * the relative `assets/...` URLs it produces. At depth 0 (prefix "") output is
 * byte-identical to today; at depth 1 ("../") it resolves from the nested page.
 *
 * Run with: node --test server/tests/pathPrefixing.test.js
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Liquid } from "liquidjs";

import { AssetTag } from "../../src/core/tags/assetTag.js";
import { RenderHeaderAssetsTag } from "../../src/core/tags/renderHeaderAssets.js";
import { RenderFooterAssetsTag } from "../../src/core/tags/renderFooterAssets.js";
import { PlaceholderImageTag } from "../../src/core/tags/placeholderImageTag.js";
import { prefixSiteIcons } from "../utils/siteIconHelpers.js";

let engine;

before(() => {
  engine = new Liquid({ extname: ".liquid", cache: false });
  engine.registerTag("asset", AssetTag);
  engine.registerTag("header_assets", RenderHeaderAssetsTag);
  engine.registerTag("footer_assets", RenderFooterAssetsTag);
  engine.registerTag("placeholder_image", PlaceholderImageTag);
});

const render = (template, globals) => engine.parseAndRender(template, {}, { globals });

// Publish-mode globals at a given depth.
const publishGlobals = (outputPathPrefix, extra = {}) => ({
  renderMode: "publish",
  projectId: "p",
  apiUrl: "",
  outputPathPrefix,
  ...extra,
});

describe("assetTag — publish path prefixing", () => {
  it("CSS: root is unprefixed, depth-1 gets ../", async () => {
    const tpl = '{% asset src: "base.css" %}';
    assert.equal(await render(tpl, publishGlobals("")), '<link rel="stylesheet" href="assets/base.css">');
    assert.equal(await render(tpl, publishGlobals("../")), '<link rel="stylesheet" href="../assets/base.css">');
  });

  it("JS with cache-busting version: prefix precedes assets/, query preserved", async () => {
    const tpl = '{% asset src: "app.js" %}';
    assert.equal(await render(tpl, publishGlobals("", { exportVersion: 5 })), '<script src="assets/app.js?v=5"></script>');
    assert.equal(
      await render(tpl, publishGlobals("../", { exportVersion: 5 })),
      '<script src="../assets/app.js?v=5"></script>',
    );
  });

  it("image: depth-1 gets ../", async () => {
    const tpl = '{% asset src: "diagram.png" %}';
    assert.equal(await render(tpl, publishGlobals("../")), '<img src="../assets/diagram.png">');
  });
});

describe("placeholderImageTag — publish path prefixing", () => {
  it("core placeholder: root unprefixed, depth-1 gets ../", async () => {
    const tpl = "{% placeholder_image %}";
    assert.match(await render(tpl, publishGlobals("")), /src="assets\/placeholder\.svg"/);
    assert.match(await render(tpl, publishGlobals("../")), /src="\.\.\/assets\/placeholder\.svg"/);
  });

  it("custom src + output url: depth-1 gets ../", async () => {
    const tpl = '{% placeholder_image src: "custom.png", output: "url" %}';
    assert.equal(await render(tpl, publishGlobals("../")), "../assets/custom.png");
  });
});

describe("renderHeaderAssets — publish path prefixing", () => {
  it("enqueued header style/script: depth-1 gets ../", async () => {
    const globals = publishGlobals("../", {
      enqueuedStyles: new Map([["theme.css", { location: "header", priority: 10 }]]),
      enqueuedScripts: new Map([["theme.js", { location: "header", priority: 10, defer: true }]]),
    });
    const result = await render("{% header_assets %}", globals);
    assert.match(result, /<link rel="stylesheet" href="\.\.\/assets\/theme\.css">/);
    assert.match(result, /<script src="\.\.\/assets\/theme\.js" defer><\/script>/);
  });

  it("preload href: relative src is prefixed at depth-1, untouched at root", async () => {
    const mk = (prefix) =>
      publishGlobals(prefix, { enqueuedPreloads: new Map([["hero.jpg", { as: "image", fetchpriority: "high" }]]) });
    assert.match(await render("{% header_assets %}", mk("")), /href="hero\.jpg"/);
    assert.match(await render("{% header_assets %}", mk("../")), /href="\.\.\/hero\.jpg"/);
  });

  it("preload imagesrcset: each candidate URL is prefixed at depth-1, byte-identical at root", async () => {
    const srcset = "a.jpg 320w, b.jpg 640w";
    const mk = (prefix) =>
      publishGlobals(prefix, { enqueuedPreloads: new Map([["hero.jpg", { as: "image", imagesrcset: srcset }]]) });
    // root: exact original string preserved
    assert.match(await render("{% header_assets %}", mk("")), /imagesrcset="a\.jpg 320w, b\.jpg 640w"/);
    // depth-1: every URL prefixed, descriptors intact
    assert.match(
      await render("{% header_assets %}", mk("../")),
      /imagesrcset="\.\.\/a\.jpg 320w, \.\.\/b\.jpg 640w"/,
    );
  });

  it("absolute preload URLs are never prefixed", async () => {
    const globals = publishGlobals("../", {
      enqueuedPreloads: new Map([["https://cdn.example.com/hero.jpg", { as: "image" }]]),
    });
    assert.match(await render("{% header_assets %}", globals), /href="https:\/\/cdn\.example\.com\/hero\.jpg"/);
  });
});

describe("renderFooterAssets — publish path prefixing", () => {
  it("enqueued footer style/script: depth-1 gets ../", async () => {
    const globals = publishGlobals("../", {
      enqueuedStyles: new Map([["foot.css", { location: "footer", priority: 10 }]]),
      enqueuedScripts: new Map([["foot.js", { location: "footer", priority: 10 }]]),
    });
    const result = await render("{% footer_assets %}", globals);
    assert.match(result, /<link rel="stylesheet" href="\.\.\/assets\/foot\.css">/);
    assert.match(result, /<script src="\.\.\/assets\/foot\.js"><\/script>/);
  });
});

describe("prefixSiteIcons", () => {
  const icons = {
    primaryIconHref: "favicon.svg",
    primaryIconType: "image/svg+xml",
    primaryIconSizes: "any",
    legacyIconHref: "favicon-32.png",
    appleTouchIconHref: "apple-touch-icon.png",
    manifestHref: "site.webmanifest",
  };

  it("returns an unchanged shallow copy at the root (prefix '')", () => {
    const out = prefixSiteIcons(icons, "");
    assert.notEqual(out, icons); // shallow copy, not the same reference
    assert.deepEqual(out, icons);
  });

  it("prefixes every href field at depth-1, leaving type/sizes alone", () => {
    const out = prefixSiteIcons(icons, "../");
    assert.equal(out.primaryIconHref, "../favicon.svg");
    assert.equal(out.legacyIconHref, "../favicon-32.png");
    assert.equal(out.appleTouchIconHref, "../apple-touch-icon.png");
    assert.equal(out.manifestHref, "../site.webmanifest");
    assert.equal(out.primaryIconType, "image/svg+xml");
    assert.equal(out.primaryIconSizes, "any");
  });

  it("leaves empty href fields empty", () => {
    const out = prefixSiteIcons({ ...icons, legacyIconHref: "" }, "../");
    assert.equal(out.legacyIconHref, "");
  });
});
