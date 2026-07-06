/**
 * Depth-aware asset/tag path prefixing.
 *
 * Every asset-emitting tag, in publish mode, must prepend `outputPathPrefix`
 * (the per-render global: "" at the export root, "../" one directory deep) to
 * the relative `assets/...` URLs it produces. At depth 0 (prefix "") output is
 * byte-identical to today; at depth 1 ("../") it resolves from the nested page.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { Liquid } from "liquidjs";

import { AssetTag } from "../assetTag.js";
import { RenderHeaderAssetsTag } from "../renderHeaderAssets.js";
import { RenderFooterAssetsTag } from "../renderFooterAssets.js";
import { PlaceholderImageTag } from "../placeholderImageTag.js";
import { prefixSiteIcons } from "../../utils/linkPrefixer.js";

let engine;

beforeAll(() => {
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
    expect(await render(tpl, publishGlobals(""))).toBe('<link rel="stylesheet" href="assets/base.css">');
    expect(await render(tpl, publishGlobals("../"))).toBe('<link rel="stylesheet" href="../assets/base.css">');
  });

  it("JS with cache-busting version: prefix precedes assets/, query preserved", async () => {
    const tpl = '{% asset src: "app.js" %}';
    expect(await render(tpl, publishGlobals("", { exportVersion: 5 }))).toBe('<script src="assets/app.js?v=5"></script>');
    expect(await render(tpl, publishGlobals("../", { exportVersion: 5 }))).toBe(
      '<script src="../assets/app.js?v=5"></script>',
    );
  });

  it("image: depth-1 gets ../", async () => {
    const tpl = '{% asset src: "diagram.png" %}';
    expect(await render(tpl, publishGlobals("../"))).toBe('<img src="../assets/diagram.png">');
  });
});

describe("placeholderImageTag — publish path prefixing", () => {
  it("core placeholder: root unprefixed, depth-1 gets ../", async () => {
    const tpl = "{% placeholder_image %}";
    expect(await render(tpl, publishGlobals(""))).toMatch(/src="assets\/placeholder\.svg"/);
    expect(await render(tpl, publishGlobals("../"))).toMatch(/src="\.\.\/assets\/placeholder\.svg"/);
  });

  it("custom src + output url: depth-1 gets ../", async () => {
    const tpl = '{% placeholder_image src: "custom.png", output: "url" %}';
    expect(await render(tpl, publishGlobals("../"))).toBe("../assets/custom.png");
  });
});

describe("renderHeaderAssets — publish path prefixing", () => {
  it("enqueued header style/script: depth-1 gets ../", async () => {
    const globals = publishGlobals("../", {
      enqueuedStyles: new Map([["theme.css", { location: "header", priority: 10 }]]),
      enqueuedScripts: new Map([["theme.js", { location: "header", priority: 10, defer: true }]]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toMatch(/<link rel="stylesheet" href="\.\.\/assets\/theme\.css">/);
    expect(result).toMatch(/<script src="\.\.\/assets\/theme\.js" defer><\/script>/);
  });

  it("preload href: relative src is prefixed at depth-1, untouched at root", async () => {
    const mk = (prefix) =>
      publishGlobals(prefix, { enqueuedPreloads: new Map([["hero.jpg", { as: "image", fetchpriority: "high" }]]) });
    expect(await render("{% header_assets %}", mk(""))).toMatch(/href="hero\.jpg"/);
    expect(await render("{% header_assets %}", mk("../"))).toMatch(/href="\.\.\/hero\.jpg"/);
  });

  it("preload imagesrcset: each candidate URL is prefixed at depth-1, byte-identical at root", async () => {
    const srcset = "a.jpg 320w, b.jpg 640w";
    const mk = (prefix) =>
      publishGlobals(prefix, { enqueuedPreloads: new Map([["hero.jpg", { as: "image", imagesrcset: srcset }]]) });
    // root: exact original string preserved
    expect(await render("{% header_assets %}", mk(""))).toMatch(/imagesrcset="a\.jpg 320w, b\.jpg 640w"/);
    // depth-1: every URL prefixed, descriptors intact
    expect(await render("{% header_assets %}", mk("../"))).toMatch(/imagesrcset="\.\.\/a\.jpg 320w, \.\.\/b\.jpg 640w"/);
  });

  it("absolute preload URLs are never prefixed", async () => {
    const globals = publishGlobals("../", {
      enqueuedPreloads: new Map([["https://cdn.example.com/hero.jpg", { as: "image" }]]),
    });
    expect(await render("{% header_assets %}", globals)).toMatch(/href="https:\/\/cdn\.example\.com\/hero\.jpg"/);
  });
});

describe("renderFooterAssets — publish path prefixing", () => {
  it("enqueued footer style/script: depth-1 gets ../", async () => {
    const globals = publishGlobals("../", {
      enqueuedStyles: new Map([["foot.css", { location: "footer", priority: 10 }]]),
      enqueuedScripts: new Map([["foot.js", { location: "footer", priority: 10 }]]),
    });
    const result = await render("{% footer_assets %}", globals);
    expect(result).toMatch(/<link rel="stylesheet" href="\.\.\/assets\/foot\.css">/);
    expect(result).toMatch(/<script src="\.\.\/assets\/foot\.js"><\/script>/);
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
    expect(out).not.toBe(icons); // shallow copy, not the same reference
    expect(out).toEqual(icons);
  });

  it("prefixes every href field at depth-1, leaving type/sizes alone", () => {
    const out = prefixSiteIcons(icons, "../");
    expect(out.primaryIconHref).toBe("../favicon.svg");
    expect(out.legacyIconHref).toBe("../favicon-32.png");
    expect(out.appleTouchIconHref).toBe("../apple-touch-icon.png");
    expect(out.manifestHref).toBe("../site.webmanifest");
    expect(out.primaryIconType).toBe("image/svg+xml");
    expect(out.primaryIconSizes).toBe("any");
  });

  it("leaves empty href fields empty", () => {
    const out = prefixSiteIcons({ ...icons, legacyIconHref: "" }, "../");
    expect(out.legacyIconHref).toBe("");
  });
});
