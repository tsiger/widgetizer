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
import { EnqueueScriptTag } from "../enqueueScript.js";
import { EnqueueStyleTag } from "../enqueueStyle.js";
import { EnqueuePreloadTag } from "../enqueuePreload.js";
import { prefixSiteIcons } from "../../utils/linkPrefixer.js";

let engine;

beforeAll(() => {
  engine = new Liquid({ extname: ".liquid", cache: false });
  engine.registerTag("asset", AssetTag);
  engine.registerTag("header_assets", RenderHeaderAssetsTag);
  engine.registerTag("footer_assets", RenderFooterAssetsTag);
  engine.registerTag("placeholder_image", PlaceholderImageTag);
  engine.registerTag("enqueue_script", EnqueueScriptTag);
  engine.registerTag("enqueue_style", EnqueueStyleTag);
  engine.registerTag("enqueue_preload", EnqueuePreloadTag);
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

  it("recognises stylesheets and scripts regardless of extension case", async () => {
    const v = "5-0.9.10-20260806T142530";
    expect(await render('{% asset src: "Theme.CSS" %}', publishGlobals("", { assetVersion: v }))).toBe(
      `<link rel="stylesheet" href="assets/Theme.CSS?v=${v}">`,
    );
    expect(await render('{% asset src: "App.JS" %}', publishGlobals("", { assetVersion: v }))).toBe(
      `<script src="assets/App.JS?v=${v}"></script>`,
    );
  });

  it("JS with cache-busting version: prefix precedes assets/, query preserved", async () => {
    const tpl = '{% asset src: "app.js" %}';
    const v = "5-0.9.10-20260806T142530";
    expect(await render(tpl, publishGlobals("", { assetVersion: v }))).toBe(
      `<script src="assets/app.js?v=${v}"></script>`,
    );
    expect(await render(tpl, publishGlobals("../", { assetVersion: v }))).toBe(
      `<script src="../assets/app.js?v=${v}"></script>`,
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

  // A preload only helps when its href is byte-identical to the request it warms.
  // For as="script"/"style", a bare filename resolves exactly like enqueue_script /
  // enqueue_style — same assets/ path, same depth prefix, same ?v= token.
  it("script/style preloads with a bare filename resolve like the enqueued asset", async () => {
    const TOKEN = "3-0.9.10-20260806T142530";
    const globals = publishGlobals("../", {
      assetVersion: TOKEN,
      enqueuedPreloads: new Map([
        ["main.js", { as: "script" }],
        ["theme.css", { as: "style" }],
      ]),
      enqueuedScripts: new Map([["main.js", { location: "header", priority: 10 }]]),
      enqueuedStyles: new Map([["theme.css", { location: "header", priority: 10 }]]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toContain(`<link rel="preload" href="../assets/main.js?v=${TOKEN}" as="script" >`);
    expect(result).toContain(`<script src="../assets/main.js?v=${TOKEN}"></script>`);
    expect(result).toContain(`<link rel="preload" href="../assets/theme.css?v=${TOKEN}" as="style" >`);
    expect(result).toContain(`<link rel="stylesheet" href="../assets/theme.css?v=${TOKEN}">`);
  });

  it("script/style preloads route through the preview API in preview mode", async () => {
    const globals = {
      renderMode: "preview",
      apiUrl: "http://localhost:3001",
      projectId: "p1",
      enqueuedPreloads: new Map([["main.js", { as: "script" }]]),
    };
    expect(await render("{% header_assets %}", globals)).toContain(
      `href="http://localhost:3001/api/preview/assets/p1/assets/main.js"`,
    );
  });

  // Run the real tags inside a widget environment: the preload must land on the
  // widget's own preview route, exactly like the script it warms — not on the
  // theme assets/ route, which serves a different (or missing) file.
  it("a widget's own script preload resolves to the same preview URL as its script", async () => {
    const globals = { renderMode: "preview", apiUrl: "http://localhost:3001", projectId: "p1" };
    const tpl =
      '{% enqueue_preload src: "slideshow.js", as: "script" %}{% enqueue_script src: "slideshow.js", location: "header" %}{% header_assets %}';
    const result = await engine.parseAndRender(tpl, { widget: { type: "slideshow" } }, { globals });
    const expected = "http://localhost:3001/api/preview/assets/p1/widgets/slideshow/slideshow.js";
    expect(result).toContain(`<link rel="preload" href="${expected}" as="script" >`);
    expect(result).toContain(`<script src="${expected}"></script>`);
  });

  it("a widget's theme: true preload resolves to the theme assets route, like its script", async () => {
    const globals = { renderMode: "preview", apiUrl: "http://localhost:3001", projectId: "p1" };
    const tpl =
      '{% enqueue_preload src: "base.js", as: "script", theme: true %}{% enqueue_script src: "base.js", theme: true, location: "header" %}{% header_assets %}';
    const result = await engine.parseAndRender(tpl, { widget: { type: "slideshow" } }, { globals });
    const expected = "http://localhost:3001/api/preview/assets/p1/assets/base.js";
    expect(result).toContain(`<link rel="preload" href="${expected}" as="script" >`);
    expect(result).toContain(`<script src="${expected}"></script>`);
  });

  it("matches the as attribute case-insensitively, as browsers do", async () => {
    const globals = publishGlobals("", {
      assetVersion: "3-0.9.10-20260806T142530",
      enqueuedPreloads: new Map([["main.js", { as: "Script" }]]),
    });
    expect(await render("{% header_assets %}", globals)).toContain(
      `href="assets/main.js?v=3-0.9.10-20260806T142530" as="Script" >`,
    );
  });

  it("classifies on the path only — a query containing / or : still resolves like the script", async () => {
    const TOKEN = "3-0.9.10-20260806T142530";
    const globals = publishGlobals("../", {
      assetVersion: TOKEN,
      enqueuedPreloads: new Map([["main.js?next=/dashboard&at=12:30", { as: "script" }]]),
      enqueuedScripts: new Map([["main.js?next=/dashboard&at=12:30", { location: "header", priority: 10 }]]),
    });
    const result = await render("{% header_assets %}", globals);
    const url = `../assets/main.js?next=/dashboard&at=12:30&v=${TOKEN}`;
    expect(result).toContain(`<link rel="preload" href="${url}" as="script" >`);
    expect(result).toContain(`<script src="${url}"></script>`);
  });

  // Fonts are the case preloads exist for (the browser only discovers them
  // after parsing CSS). A relative path is "under the theme's assets/ folder"
  // and resolves like the CSS url() does — no ?v= token, theme route even
  // from inside a widget (the export never ships widget-folder fonts).
  it("font preloads: a relative path resolves under assets/ in publish, without a token", async () => {
    const globals = publishGlobals("../", {
      assetVersion: "3-0.9.10-20260806T142530",
      enqueuedPreloads: new Map([["fonts/Inter.woff2", { as: "font", type: "font/woff2", crossorigin: true }]]),
    });
    expect(await render("{% header_assets %}", globals)).toContain(
      `<link rel="preload" href="../assets/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin >`,
    );
  });

  it("font preloads: a relative path resolves to the theme assets route in preview, even inside a widget", async () => {
    const globals = { renderMode: "preview", apiUrl: "http://localhost:3001", projectId: "p1" };
    const tpl = '{% enqueue_preload src: "fonts/Inter.woff2", as: "font", type: "font/woff2", crossorigin: true %}{% header_assets %}';
    const result = await engine.parseAndRender(tpl, { widget: { type: "hero" } }, { globals });
    expect(result).toContain(`href="http://localhost:3001/api/preview/assets/p1/assets/fonts/Inter.woff2"`);
  });

  it("font preloads: assets/-prefixed, root-absolute and external srcs are passed through", async () => {
    const globals = publishGlobals("../", {
      enqueuedPreloads: new Map([
        ["assets/fonts/A.woff2", { as: "font" }],
        ["/fonts/B.woff2", { as: "font" }],
        ["https://fonts.gstatic.com/C.woff2", { as: "font" }],
      ]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toContain(`href="../assets/fonts/A.woff2"`);
    expect(result).toContain(`href="/fonts/B.woff2"`);
    expect(result).toContain(`href="https://fonts.gstatic.com/C.woff2"`);
  });

  it("script/style preloads accept a sub-path under assets/, like enqueue_script does", async () => {
    const TOKEN = "3-0.9.10-20260806T142530";
    const globals = publishGlobals("", {
      assetVersion: TOKEN,
      enqueuedPreloads: new Map([["vendor/lib.js", { as: "script" }]]),
      enqueuedScripts: new Map([["vendor/lib.js", { location: "header", priority: 10 }]]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toContain(`<link rel="preload" href="assets/vendor/lib.js?v=${TOKEN}" as="script" >`);
    expect(result).toContain(`<script src="assets/vendor/lib.js?v=${TOKEN}"></script>`);
  });

  it("image preloads take the {% image %} output as-is, which is already depth-prefixed on nested pages", async () => {
    // {% image … output: 'path' %} emits `<outputPathPrefix>assets/images/…` in
    // publish mode, so an already-prefixed src must not be prefixed twice.
    const globals = publishGlobals("../", {
      enqueuedPreloads: new Map([
        ["../assets/images/hero.jpg", { as: "image", imagesrcset: "../assets/images/a.jpg 320w, ../assets/images/b.jpg 640w" }],
        ["images/hero.jpg", { as: "image" }],
      ]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toContain(`href="../assets/images/hero.jpg"`);
    expect(result).toContain(`imagesrcset="../assets/images/a.jpg 320w, ../assets/images/b.jpg 640w"`);
    expect(result).not.toContain("../../");
    // A plain relative image path (not from {% image %}) is still depth-prefixed.
    expect(result).toContain(`href="../images/hero.jpg"`);
  });

  it("a capitalised Assets/ sub-folder is a theme-relative path, not the assets/ prefix", async () => {
    const TOKEN = "3-0.9.10-20260806T142530";
    const globals = publishGlobals("", {
      assetVersion: TOKEN,
      enqueuedPreloads: new Map([["Assets/x.js", { as: "script" }]]),
      enqueuedScripts: new Map([["Assets/x.js", { location: "header", priority: 10 }]]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toContain(`<link rel="preload" href="assets/Assets/x.js?v=${TOKEN}" as="script" >`);
    expect(result).toContain(`<script src="assets/Assets/x.js?v=${TOKEN}"></script>`);
  });

  it("script/style preloads whose src is already a path or URL are passed through", async () => {
    const globals = publishGlobals("../", {
      assetVersion: "3-0.9.10-20260806T142530",
      enqueuedPreloads: new Map([
        ["assets/vendor/lib.js", { as: "script" }],
        ["https://cdn.example.com/lib.js", { as: "script" }],
        ["data:text/javascript,void%200", { as: "script" }],
        ["vendor\\lib.js", { as: "script" }],
      ]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toContain(`href="../assets/vendor/lib.js"`);
    expect(result).toContain(`href="https://cdn.example.com/lib.js"`);
    expect(result).toContain(`href="data:text/javascript,void%200"`);
    expect(result).toContain(`href="../vendor\\lib.js"`);
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

// The enqueued-asset tags have no extension gate of their own, so the cache-busting
// token must reach every stylesheet/script they emit — including uppercase
// extensions — and sit after the depth prefix.
describe("header_assets / footer_assets — cache-busting token", () => {
  const TOKEN = "3-0.9.10-20260806T142530";

  it("header_assets stamps ?v= on enqueued styles and scripts", async () => {
    const globals = publishGlobals("../", {
      assetVersion: TOKEN,
      enqueuedStyles: new Map([["theme.CSS", { location: "header", priority: 10 }]]),
      enqueuedScripts: new Map([["app.JS", { location: "header", priority: 10, defer: true }]]),
    });
    const result = await render("{% header_assets %}", globals);
    expect(result).toContain(`<link rel="stylesheet" href="../assets/theme.CSS?v=${TOKEN}">`);
    expect(result).toContain(`<script src="../assets/app.JS?v=${TOKEN}" defer></script>`);
  });

  it("footer_assets stamps ?v= on enqueued styles and scripts", async () => {
    const globals = publishGlobals("", {
      assetVersion: TOKEN,
      enqueuedStyles: new Map([["foot.css", { location: "footer", priority: 10 }]]),
      enqueuedScripts: new Map([["foot.js", { location: "footer", priority: 10 }]]),
    });
    const result = await render("{% footer_assets %}", globals);
    expect(result).toContain(`<link rel="stylesheet" href="assets/foot.css?v=${TOKEN}">`);
    expect(result).toContain(`<script src="assets/foot.js?v=${TOKEN}"></script>`);
  });
});

describe("prefixSiteIcons", () => {
  const icons = {
    primaryIconHref: "favicon.svg",
    primaryIconType: "image/svg+xml",
    primaryIconSizes: "any",
    legacyIconHref: "favicon-32.png",
    serpIconHref: "icon-192.png",
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
    expect(out.serpIconHref).toBe("../icon-192.png");
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
