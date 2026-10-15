import { describe, it, expect } from "vitest";
import { extractProblems, imagesIn } from "../tools/preview.js";
import { collectUploadPaths, embeddedMedia, fitSettings } from "../tools/shared.js";

describe("preview diagnostics", () => {
  it("lifts widget and page errors out of the page, with paths redacted", () => {
    const html = String.raw`<body><div class="widget-error" data-widget-id="hero" data-widget-type="banner"><p>x</p><pre>Bad tag in C:\Users\me\site\widgets\banner\widget.liquid
stack line /home/me/app/render.js:10</pre></div><p>Visible</p>
<h1>Error rendering page</h1><pre>Missing layout at C:/Users/me/site/layout.liquid and \\server\share\x and /srv/wz/data/layout.liquid</pre></body>`;
    const { cleaned, problems } = extractProblems(html);
    expect(problems).toEqual([
      { section: "hero", type: "banner", message: "Bad tag in [path]" },
      { section: null, type: "page", message: "Missing layout at [path] and [path] and [path]" },
    ]);
    expect(cleaned).toContain("Visible");
    expect(cleaned).not.toMatch(/Users|server|srv|stack/);
  });

  it("tells described, decorative and missing alt text apart", () => {
    const html = `<img src="a" alt="Landscape"><img src="b" alt='Sea'><img src="c" alt=Cliff><img src="d" alt=""><img src="e">`;
    expect(imagesIn(html)).toEqual({ total: 5, described: 3, decorative: 1, missingAlt: 1 });
  });
});

describe("media references and budgets", () => {
  it("finds uploads embedded in rich text and lists them by setting", () => {
    const settings = {
      body: '<p><img src="/uploads/images/photo-large.webp" alt="x"> <a href="/uploads/files/menu.pdf">Menu</a></p>',
      image: "/uploads/images/hero.webp",
    };
    expect([...collectUploadPaths(settings)].sort()).toEqual([
      "/uploads/files/menu.pdf",
      "/uploads/images/hero.webp",
      "/uploads/images/photo-large.webp",
    ]);
    const ids = new Map([["/uploads/images/photo-large.webp", "m1"]]);
    expect(embeddedMedia(settings, ids)).toEqual([
      { setting: "body", media: "m1", file: "photo-large.webp" },
      { setting: "body", media: null, file: "menu.pdf", note: "Not in the media library." },
    ]);
  });

  it("shortens many medium values and large structured ones until they fit, each still readable", () => {
    const settings = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`text${i}`, "x".repeat(3000)]));
    settings.items = Array.from({ length: 200 }, (_, i) => ({ label: `Item ${i}` }));
    const { settings: fitted, fits } = fitSettings(settings, "s1/", 20000);
    expect(fits).toBe(true);
    expect(JSON.stringify(fitted).length).toBeLessThanOrEqual(20000);
    expect(fitted.text0).toMatchObject({ longValue: true, length: 3000, readWith: { field: "s1/text0" } });
    expect(fitted.items).toMatchObject({ longValue: true, readWith: { field: "s1/items" } });
  });
});
