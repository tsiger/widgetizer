import { describe, it, expect, afterEach } from "vitest";
import { startBridge, json, createSite } from "./helpers.js";
import { BRIDGE_BASE, BRIDGE_PROTOCOL } from "../protocol.js";

// The theme's guidance as the assistant receives it: a structured widget guide in
// pieces, one recipe on request, the theme's composition guide, and a preset's
// guidance with the inventory derived from its files.

let bridge;
afterEach(async () => {
  await bridge?.close();
  bridge = null;
});

const bannerGuide = `# banner

## Purpose

A full-width opener with an optional photo and a stack of blocks.

It also serves as an imageless page title.

## When to use

- Homepage heroes.

## Pitfalls

- Under \`transparent_on_hero\` an imageless light banner breaks contrast.

## Recipes

### Classic hero

Good for the homepage. Needs one wide photo.

\`\`\`json
{ "type": "banner", "settings": { "height": "large" }, "blocks": [{ "type": "heading", "settings": { "text": "Headline" } }] }
\`\`\`

### Page title

A clean inner-page opener.

\`\`\`json
{ "type": "banner", "settings": { "height": "auto" } }
\`\`\`
`;

const legacyGuide = "# Image Widget Insights\n\nA single responsive image.\n\n---\n\n## Settings Levers\n\n| image | any |\n";

const schemas = [
  {
    type: "banner",
    displayName: "Banner",
    source: { kind: "theme", path: "widgets/banner" },
    settings: [{ type: "select", id: "height", options: ["auto", "large"], default: "auto" }],
    blocks: [{ type: "heading", displayName: "Heading", settings: [{ type: "text", id: "text" }] }],
  },
  {
    type: "footer",
    displayName: "Footer",
    source: { kind: "global", path: "widgets/global/footer" },
    settings: [{ type: "text", id: "copyright" }],
    blocks: [{ type: "text_block", displayName: "Text", settings: [{ type: "text", id: "text" }] }],
  },
  {
    type: "news-grid",
    displayName: "News grid",
    source: { kind: "theme", path: "widgets/news-grid" },
    collection: { type: "news", perPageSetting: "limit" },
    settings: [{ type: "number", id: "limit", default: 3 }],
    blocks: [],
  },
  {
    type: "image",
    displayName: "Image",
    source: { kind: "theme", path: "widgets/image" },
    settings: [{ type: "image", id: "image" }],
    blocks: [],
  },
];

const footerGuide = `# footer

## Purpose

The site's footer.

## When to use

- Always; there is one.

## Recipes

### Simple footer

A copyright line and one text block.

\`\`\`json
{ "settings": { "copyright": "Example" }, "blocks": [{ "type": "text_block", "settings": { "text": "Hello" } }] }
\`\`\`
`;

const guides = { banner: bannerGuide, image: legacyGuide, footer: footerGuide };

function reader(extra = {}) {
  return {
    widgetSchemas: async () => schemas,
    labelLocale: async () => ({}),
    widgetGuidance: async (scope, schema) => guides[schema.type] ?? null,
    presets: async () => ({ default: "blank", presets: [{ id: "blank", name: "Blank" }, { id: "brewline", name: "Brewline", description: "Coffee shop", liveDemo: "https://example.com/brewline/" }] }),
    themeGuidance: async () => "# Arch\n\nUse `highlight-primary` once per page.",
    themes: async () => [{ id: "arch", name: "Arch", description: "The reference theme", version: "0.9.10" }],
    presetDetails: async (theme, preset) =>
      theme === "arch" && preset === "brewline"
        ? {
            id: "brewline",
            name: "Brewline",
            description: "Coffee shop",
            liveDemo: "https://example.com/brewline/",
            isDefault: false,
            pages: ["about", "contact", "index", "menu"],
            menus: ["footer-menu", "main-menu"],
            collections: { news: 3 },
            guidance: "# Brewline\n\n## Suits\n\nCafés and bakeries.\n\n## Look\n\nWarm and bright.\n\n## Adapting\n\n- A bakery: rename `menu`.\n",
          }
        : null,
    ...extra,
  };
}

async function start(readerOverrides) {
  bridge = await startBridge({ site: createSite({ reader: reader(readerOverrides) }) });
  const { data: session } = await json(`${bridge.url}${BRIDGE_BASE}/session`, {
    method: "POST",
    headers: { authorization: `Bearer ${bridge.token()}` },
    body: { bridge: BRIDGE_PROTOCOL, relay: { version: "1" }, client: { name: "Test", version: "1" } },
  });
  let counter = 0;
  return (tool, args = {}) =>
    json(`${bridge.url}${BRIDGE_BASE}/call/${tool}`, {
      method: "POST",
      headers: { authorization: `Bearer ${session.sessionToken}`, "x-widgetizer-session": session.sessionId },
      body: { requestId: `guidance-req-${++counter}`, arguments: args },
    });
}

describe("guidance tools", () => {
  it("theme_catalog shows each section's purpose from its guidance, structured or not", async () => {
    const call = await start();
    const { data } = await call("theme_catalog");
    const byType = Object.fromEntries(data.structuredContent.sections.map((section) => [section.type, section.purpose]));
    expect(byType.banner).toBe("A full-width opener with an optional photo and a stack of blocks.");
    expect(byType.image).toBe("A single responsive image.");
  });

  it("section_details serves the fixed sections and the recipe names, and one recipe on request", async () => {
    const call = await start();
    const { data } = await call("section_details", { type: "banner" });
    const guidance = data.structuredContent.guidance;
    expect(guidance.advisory).toBe(true);
    expect(guidance.source).toBe("arch");
    expect(guidance.purpose).toContain("imageless page title");
    expect(guidance.pitfalls).toContain("transparent_on_hero");
    expect(guidance.recipes).toEqual([
      { name: "Classic hero", notes: "Good for the homepage. Needs one wide photo." },
      { name: "Page title", notes: "A clean inner-page opener." },
    ]);
    expect(guidance.text).toBeUndefined();

    const recipe = await call("section_details", { type: "banner", recipe: "Classic hero" });
    expect(recipe.data.structuredContent.guidance.recipe).toMatchObject({
      name: "Classic hero",
      example: { type: "banner", settings: { height: "large" }, blocks: [{ type: "heading", settings: { text: "Headline" } }] },
    });

    const missing = await call("section_details", { type: "banner", recipe: "Nope" });
    expect(missing.data.isError).toBe(true);
    expect(missing.data.error.message).toMatch(/Classic hero, Page title/);
  });

  it("serves an older free-form guide as text in parts", async () => {
    const call = await start();
    const { data } = await call("section_details", { type: "image" });
    expect(data.structuredContent.guidance).toMatchObject({ advisory: true, part: 1, parts: 1 });
    expect(data.structuredContent.guidance.text).toContain("Settings Levers");
  });

  it("theme_guide returns the theme's composition guide, or says there is none", async () => {
    const call = await start();
    const { data } = await call("theme_guide");
    expect(data.structuredContent.guidance).toMatchObject({ source: "arch", advisory: true, part: 1, parts: 1 });
    expect(data.structuredContent.guidance.text).toContain("highlight-primary");

    await bridge.close();
    const without = await start({ themeGuidance: async () => null });
    const none = await without("theme_guide");
    expect(none.data.structuredContent.guidance).toBeNull();
    expect(none.data.structuredContent.note).toMatch(/no composition guide/);
  });

  it("list_themes and preset_details describe a starting point without an open site", async () => {
    bridge = await startBridge({ site: createSite({ open: () => "none", reader: reader() }) });
    const { data: session } = await json(`${bridge.url}${BRIDGE_BASE}/session`, {
      method: "POST",
      headers: { authorization: `Bearer ${bridge.token()}` },
      body: { bridge: BRIDGE_PROTOCOL, relay: { version: "1" }, client: { name: "Test", version: "1" } },
    });
    const headers = { authorization: `Bearer ${session.sessionToken}`, "x-widgetizer-session": session.sessionId };
    const call = (tool, args) => json(`${bridge.url}${BRIDGE_BASE}/call/${tool}`, { method: "POST", headers, body: { requestId: `guidance-${tool}`, arguments: args } });

    const themes = await call("list_themes", {});
    expect(themes.data.structuredContent.themes).toEqual([
      {
        id: "arch",
        name: "Arch",
        description: "The reference theme",
        version: "0.9.10",
        presets: [
          { id: "blank", name: "Blank" },
          { id: "brewline", name: "Brewline", description: "Coffee shop", liveDemo: "https://example.com/brewline/" },
        ],
      },
    ]);

    const details = await call("preset_details", { theme: "arch", preset: "brewline" });
    expect(details.data.structuredContent).toMatchObject({
      theme: "arch",
      preset: { id: "brewline", name: "Brewline", liveDemo: "https://example.com/brewline/" },
      pages: ["about", "contact", "index", "menu"],
      menus: ["footer-menu", "main-menu"],
      collections: { news: 3 },
      guidance: { advisory: true, suits: "Cafés and bakeries.", look: "Warm and bright.", adapting: "- A bakery: rename `menu`." },
    });

    const unknown = await call("preset_details", { theme: "arch", preset: "nope" });
    expect(unknown.data.isError).toBe(true);
    expect(unknown.data.error.code).toBe("PRESET_NOT_FOUND");
  });

  it("get_guidance knows the new_site topic", async () => {
    const call = await start();
    const { data } = await call("get_guidance", { topic: "new_site" });
    expect(data.structuredContent.text).toMatch(/Suitability is not functionality/);
  });

  it("tells the assistant to change the header or footer in place, and fills in a recipe's missing type", async () => {
    const call = await start();
    const { data } = await call("section_details", { type: "footer", recipe: "Simple footer" });
    const recipe = data.structuredContent.guidance.recipe;
    expect(recipe.example).toEqual({ type: "footer", settings: { copyright: "Example" }, blocks: [{ type: "text_block", settings: { text: "Hello" } }] });
    expect(recipe.howToUse).toMatch(/can't be added/);
    expect(recipe.howToUse).toMatch(/addBlock/);

    const page = await call("section_details", { type: "banner", recipe: "Classic hero" });
    expect(page.data.structuredContent.guidance.recipe.howToUse).toMatch(/op add/);
  });

  it("answers RECIPE_NOT_FOUND for a recipe asked of an older free-form guide", async () => {
    const call = await start();
    const { data } = await call("section_details", { type: "image", recipe: "Anything" });
    expect(data.isError).toBe(true);
    expect(data.error.code).toBe("RECIPE_NOT_FOUND");
  });

  it("lists the editor's listing controls among a collection listing's settings", async () => {
    const call = await start();
    const { data } = await call("section_details", { type: "news-grid" });
    expect(data.structuredContent.settings.map((setting) => setting.id)).toEqual(["limit", "listing_anchor", "paginate"]);
  });

  it("returns every part of a long preset guide that lacks its three sections", async () => {
    const long = `# Old

${"x".repeat(12100)} SENTINEL-END`;
    const call = await start({
      presetDetails: async () => ({ id: "old", name: "Old", pages: [], menus: [], collections: {}, guidance: long }),
    });
    const first = await call("preset_details", { theme: "arch", preset: "old" });
    expect(first.data.structuredContent.guidance).toMatchObject({ part: 1, parts: 2 });
    expect(first.data.structuredContent.guidance.text).not.toContain("SENTINEL-END");
    const second = await call("preset_details", { theme: "arch", preset: "old", part: 2 });
    expect(second.data.structuredContent.guidance.text).toContain("SENTINEL-END");
  });
});
