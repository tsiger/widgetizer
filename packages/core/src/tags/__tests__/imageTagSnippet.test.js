import { describe, it, expect } from "vitest";
import { Liquid } from "liquidjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ImageTag } from "../imageTag.js";
import { registerMediaMetaFilter } from "../../filters/mediaMetaFilter.js";

/**
 * `{% render %}` hands a snippet only its arguments and the globals, never the
 * page's own variables. The engine puts the media map, the image base path and
 * the page being rendered on the globals, so an image drawn inside a snippet
 * must come out exactly as it does at the top level: same src, same srcset,
 * alt text in the page's language.
 */
const FILE = {
  type: "image/webp",
  path: "/uploads/images/shot.webp",
  width: 1920,
  height: 1200,
  sizes: {
    small: { path: "/uploads/images/shot-small.webp", width: 480, height: 300 },
    medium: { path: "/uploads/images/shot-medium.webp", width: 1024, height: 640 },
  },
  metadata: { alt: "A coffee shop homepage", title: "Shot", caption: "" },
  translations: { el: { alt: "Αρχική σελίδα καφετέριας", title: null, caption: null } },
};

// Mirrors how the engine passes the bag: as the render environment's `globals`
// key and as LiquidJS's `globals` option, with `page` only in the environment.
function renderWithSnippet(snippet, template, language = "el") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "image-snippet-"));
  fs.writeFileSync(path.join(root, "card.liquid"), snippet);
  const engine = new Liquid({ root: [root], extname: ".liquid", outputEscape: "escape" });
  engine.registerTag("image", ImageTag);
  registerMediaMetaFilter(engine);
  const page = { language };
  const globals = { mediaFiles: { "shot.webp": FILE }, imagePath: "../assets/images", currentPageData: page };
  try {
    return engine.parseAndRenderSync(template, { globals, page, ...globals }, { globals });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const IMAGE = `{% image src: "/uploads/images/shot.webp", size: "medium", srcset: true, sizes: "50vw" %}`;
const META = `{{ "/uploads/images/shot.webp" | media_meta: "alt" }}`;

describe("{% image %} inside a snippet", () => {
  for (const tag of ["render", "include"]) {
    it(`a ${tag}'d snippet draws the same image as the top level`, () => {
      const out = renderWithSnippet(IMAGE, `${IMAGE}##{% ${tag} 'card' %}`);
      const [top, inSnippet] = out.split("##");
      expect(top).toContain('src="../assets/images/shot-medium.webp"');
      expect(top).toContain("shot-small.webp 480w");
      expect(inSnippet).toBe(top);
    });

    it(`a ${tag}'d snippet reads alt text in the page's language`, () => {
      const out = renderWithSnippet(IMAGE, `{% ${tag} 'card' %}`);
      expect(out).toContain('alt="Αρχική σελίδα καφετέριας"');
    });

    it(`media_meta in a ${tag}'d snippet answers like the top level`, () => {
      const out = renderWithSnippet(META, `${META}##{% ${tag} 'card' %}`);
      const [top, inSnippet] = out.split("##");
      expect(top).toBe("Αρχική σελίδα καφετέριας");
      expect(inSnippet).toBe(top);
    });
  }

  it("a page-level `page` still wins over the globals' copy", () => {
    const engine = new Liquid({ outputEscape: "escape" });
    engine.registerTag("image", ImageTag);
    const globals = { mediaFiles: { "shot.webp": FILE }, imagePath: "/i", currentPageData: { language: "en" } };
    const out = engine.parseAndRenderSync(IMAGE, { globals, page: { language: "el" }, ...globals }, { globals });
    expect(out).toContain('alt="Αρχική σελίδα καφετέριας"');
  });
});
