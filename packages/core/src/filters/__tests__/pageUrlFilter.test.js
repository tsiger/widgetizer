import { describe, it, expect } from "vitest";
import { Liquid } from "liquidjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerPageUrlFilters } from "../pageUrlFilter.js";

// Rendered through a real Liquid engine with the same autoescape setting the
// render engine uses, and with the globals bag passed BOTH ways the engine
// passes it (as the render environment and as LiquidJS's `globals` option), so
// these pin what a theme template actually emits — not just what the underlying
// href helpers return.
function render(template, globals, { root } = {}) {
  const engine = new Liquid({ outputEscape: "escape", extname: ".liquid", ...(root ? { root: [root] } : {}) });
  registerPageUrlFilters(engine);
  return engine.parseAndRenderSync(template, { globals }, { globals });
}

/** Write a snippet to a temp dir and render `template` with that dir as the snippet root. */
function renderWithSnippet(snippet, template, globals) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "page-url-filter-"));
  fs.writeFileSync(path.join(root, "snippet.liquid"), snippet);
  try {
    return render(template, globals, { root });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const ON = { cleanUrls: true };
const OFF = { cleanUrls: false };

describe("page_url", () => {
  it("emits the file name with Clean URLs off", () => {
    expect(render("{{ 'contact' | page_url }}", OFF)).toBe("contact.html");
  });

  it("emits the extensionless address with Clean URLs on", () => {
    expect(render("{{ 'contact' | page_url }}", ON)).toBe("contact");
  });

  it("renders the home page as index.html with Clean URLs off", () => {
    expect(render("{{ 'index' | page_url }}", OFF)).toBe("index.html");
    expect(render("{{ 'home' | page_url }}", OFF)).toBe("home.html");
  });

  it("renders the clean home link as ./ at the export root", () => {
    expect(render("{{ 'index' | page_url }}", ON)).toBe("./");
    expect(render("{{ 'home' | page_url }}", ON)).toBe("./");
  });

  it("applies the render depth", () => {
    const deep = { ...OFF, outputPathPrefix: "../" };
    expect(render("{{ 'contact' | page_url }}", deep)).toBe("../contact.html");
    expect(render("{{ 'index' | page_url }}", deep)).toBe("../index.html");
  });

  it("uses the depth prefix alone for the clean home link one level deep", () => {
    // Not `.././` — the prefix IS the home address once the extension is gone.
    expect(render("{{ 'index' | page_url }}", { ...ON, outputPathPrefix: "../" })).toBe("../");
    expect(render("{{ 'index' | page_url }}", { ...ON, outputPathPrefix: "../../" })).toBe("../../");
  });

  it("treats a missing globals bag as root depth with Clean URLs off", () => {
    expect(render("{{ 'contact' | page_url }}", undefined)).toBe("contact.html");
  });

  it("returns an empty string for a non-slug value", () => {
    expect(render("{{ '' | page_url }}", OFF)).toBe("");
    expect(render("{{ nothing | page_url }}", OFF)).toBe("");
    expect(render("{{ 42 | page_url }}", OFF)).toBe("");
  });
});

describe("item_url", () => {
  it("joins the collection slug prefix under both Clean URLs values", () => {
    expect(render("{{ 'story' | item_url: 'news' }}", OFF)).toBe("news/story.html");
    expect(render("{{ 'story' | item_url: 'news' }}", ON)).toBe("news/story");
  });

  it("applies the render depth", () => {
    expect(render("{{ 'story' | item_url: 'news' }}", { ...OFF, outputPathPrefix: "../" })).toBe("../news/story.html");
    expect(render("{{ 'story' | item_url: 'news' }}", { ...ON, outputPathPrefix: "../" })).toBe("../news/story");
  });

  it("has no home special case — an item named index is a normal item", () => {
    expect(render("{{ 'index' | item_url: 'news' }}", ON)).toBe("news/index");
  });

  it("returns an empty string when either half is missing", () => {
    expect(render("{{ 'story' | item_url }}", OFF)).toBe("");
    expect(render("{{ '' | item_url: 'news' }}", OFF)).toBe("");
  });
});

// `{% render %}` isolates the environment scope, so a filter reading only
// `globals.x` sees nothing inside a snippet and silently emits a root-depth,
// non-clean href. Every snippet in the bundled themes uses `{% render %}` (none
// use `{% include %}`), and the planned consumers of these filters — the
// pagination pager, the language switcher — are snippets, so both forms must
// produce the same href as the top level.
describe("snippet scope", () => {
  const SNIPPET = "{{ 'index' | page_url }}|{{ 'story' | item_url: 'news' }}";
  const TEMPLATE = (tag) => `${SNIPPET}##{% ${tag} 'snippet' %}`;
  const deepClean = { cleanUrls: true, outputPathPrefix: "../" };

  it("{% render %} emits the same hrefs as the top level", () => {
    const [top, inSnippet] = renderWithSnippet(SNIPPET, TEMPLATE("render"), deepClean).split("##");
    expect(top).toBe("../|../news/story");
    expect(inSnippet).toBe(top);
  });

  it("{% include %} emits the same hrefs as the top level", () => {
    const [top, inSnippet] = renderWithSnippet(SNIPPET, TEMPLATE("include"), deepClean).split("##");
    expect(top).toBe("../|../news/story");
    expect(inSnippet).toBe(top);
  });

  it("keeps the Clean URLs OFF shape inside a snippet too", () => {
    const [top, inSnippet] = renderWithSnippet(SNIPPET, TEMPLATE("render"), {
      cleanUrls: false,
      outputPathPrefix: "../",
    }).split("##");
    expect(top).toBe("../index.html|../news/story.html");
    expect(inSnippet).toBe(top);
  });
});

// The engine stamps a real boolean; requiring `=== true` keeps a stray truthy
// value (a hand-edited project JSON, a future string-typed setting) from
// quietly switching every href to the clean shape.
describe("cleanUrls is strictly boolean true", () => {
  it.each(["true", 1, "1", {}])("treats %o as Clean URLs off", (value) => {
    expect(render("{{ 'contact' | page_url }}", { cleanUrls: value })).toBe("contact.html");
  });
});

// The filters return a plain string and rely on the engine's global
// `outputEscape: "escape"` for attribute safety. Slugs are handleized upstream,
// so this is a guard against a future refactor pre-escaping or wrapping the
// return value, which would double-escape or bypass escaping entirely.
describe("escaping", () => {
  it("leaves escaping to the engine — once, not twice", () => {
    expect(render("{{ 'a&b' | page_url }}", OFF)).toBe("a&amp;b.html");
    expect(render("{{ 'a&b' | item_url: 'n&ws' }}", OFF)).toBe("n&amp;ws/a&amp;b.html");
  });

  it("passes the relative home and depth prefixes through untouched", () => {
    expect(render("{{ 'index' | page_url }}", ON)).toBe("./");
    expect(render("{{ 'index' | page_url }}", { ...ON, outputPathPrefix: "../../" })).toBe("../../");
  });
});

// A theme that writes the obvious thing must not walk the visitor out of the
// language they were reading: Arch's header logo did exactly that.
describe("page_url / item_url and the page's language", () => {
  const GREEK = { cleanUrls: false, defaultLanguage: "en", currentPageData: { language: "el" } };
  const ENGLISH = { cleanUrls: false, defaultLanguage: "en", currentPageData: { language: "en" } };

  it("links within the language of the page being rendered", () => {
    expect(render("{{ 'contact' | page_url }}", GREEK)).toBe("el/contact.html");
    expect(render("{{ 'index' | page_url }}", GREEK)).toBe("el/index.html");
    expect(render("{{ 'story' | item_url: 'news' }}", GREEK)).toBe("el/news/story.html");
  });

  it("leaves the default language at the root, as before", () => {
    expect(render("{{ 'contact' | page_url }}", ENGLISH)).toBe("contact.html");
    expect(render("{{ 'story' | item_url: 'news' }}", ENGLISH)).toBe("news/story.html");
  });

  it("knows nothing of language when the render has none, as a plain theme's does", () => {
    expect(render("{{ 'contact' | page_url }}", { cleanUrls: false })).toBe("contact.html");
  });

  it("carries the render depth with it", () => {
    expect(render("{{ 'index' | page_url }}", { ...GREEK, outputPathPrefix: "../" })).toBe("../el/index.html");
  });

  it("follows Clean URLs, home included", () => {
    expect(render("{{ 'index' | page_url }}", { ...GREEK, cleanUrls: true })).toBe("el/");
    expect(render("{{ 'contact' | page_url }}", { ...GREEK, cleanUrls: true })).toBe("el/contact");
  });

  // A deliberate cross-language link says so.
  it("takes an explicit language over the page's own", () => {
    expect(render("{{ 'contact' | page_url: lang: 'en' }}", GREEK)).toBe("contact.html");
    expect(render("{{ 'contact' | page_url: lang: 'de' }}", ENGLISH)).toBe("de/contact.html");
    expect(render("{{ 'story' | item_url: 'news', lang: 'de' }}", ENGLISH)).toBe("de/news/story.html");
  });

  it("reaches a snippet too, where the environment scope does not", () => {
    expect(
      renderWithSnippet("{{ 'contact' | page_url }}", "{% render 'snippet' %}", GREEK),
    ).toBe("el/contact.html");
  });
});
