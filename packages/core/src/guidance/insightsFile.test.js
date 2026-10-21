import { describe, it, expect } from "vitest";
import {
  parseMarkdownSections,
  parseWidgetGuide,
  parsePresetGuide,
  backtickedNames,
  firstParagraph,
  clip,
  WIDGET_GUIDE_HEADINGS,
  PRESET_GUIDE_HEADINGS,
} from "./insightsFile.js";

const widgetGuide = `# banner

## Purpose

A full-width opener with an optional photo.

Second paragraph.

## When to use

- Homepage heroes.
- Never as a \`rich-text\` replacement.

## Pitfalls

- With \`transparent_on_hero\` the header overlays it.

## Recipes

### 1. Classic hero

Good for the homepage.

\`\`\`json
{ "type": "banner", "settings": { "height": "large" }, "blocks": [{ "type": "heading", "settings": { "text": "Hi" } }] }
\`\`\`

### Broken example

\`\`\`json
{ not json }
\`\`\`

### Prose only

No example here.
`;

describe("parseMarkdownSections", () => {
  it("splits the title, intro and ## sections, ignoring headings inside code fences", () => {
    const md = "# Title\n\nIntro.\n\n## One\n\nbody\n\n```md\n## not a heading\n```\n\n## Two\n\n### sub\n\ntext";
    const parsed = parseMarkdownSections(md);
    expect(parsed.title).toBe("Title");
    expect(parsed.intro).toBe("Intro.");
    expect(parsed.sections.map((section) => section.heading)).toEqual(["One", "Two"]);
    expect(parsed.sections[0].body).toContain("## not a heading");
    expect(parsed.sections[1].body).toBe("### sub\n\ntext");
  });

  it("accepts CRLF files", () => {
    const parsed = parseMarkdownSections("# T\r\n\r\n## A\r\n\r\nx\r\n");
    expect(parsed.sections).toEqual([{ heading: "A", body: "x", line: 3 }]);
  });
});

describe("parseWidgetGuide", () => {
  it("reads the fixed sections and the recipes with their examples", () => {
    const guide = parseWidgetGuide(widgetGuide);
    expect(guide.structured).toBe(true);
    expect(guide.missing).toEqual([]);
    expect(guide.purpose).toBe("A full-width opener with an optional photo.\n\nSecond paragraph.");
    expect(guide.whenToUse).toContain("Homepage heroes");
    expect(guide.pitfalls).toContain("transparent_on_hero");
    expect(guide.recipes.map((recipe) => recipe.name)).toEqual(["Classic hero", "Broken example", "Prose only"]);
    const [classic, broken, prose] = guide.recipes;
    expect(classic.intro).toBe("Good for the homepage.");
    expect(classic.example).toEqual({
      type: "banner",
      settings: { height: "large" },
      blocks: [{ type: "heading", settings: { text: "Hi" } }],
    });
    expect(classic.error).toBeNull();
    expect(broken.example).toBeNull();
    expect(broken.error).toMatch(/not valid JSON/);
    expect(prose.error).toMatch(/no ```json example/);
  });

  it("matches headings case- and space-insensitively and reports extra ones", () => {
    const guide = parseWidgetGuide("# w\n\n## purpose\n\np\n\n## When  To Use\n\nw\n\n## Settings levers\n\n|a|");
    expect(guide.structured).toBe(true);
    expect(guide.missing).toEqual(["Pitfalls", "Recipes"]);
    expect(guide.extraHeadings).toEqual(["Settings levers"]);
  });

  it("falls back to the first prose paragraph for an older free-form file", () => {
    const guide = parseWidgetGuide("# Image Widget Insights\n\nA single responsive image.\n\n---\n\n## Settings Levers\n\n| a | b |");
    expect(guide.structured).toBe(false);
    expect(guide.purpose).toBe("A single responsive image.");
    expect(guide.missing).toEqual(WIDGET_GUIDE_HEADINGS);
    expect(guide.recipes).toEqual([]);
  });
});

describe("parsePresetGuide", () => {
  it("reads the three sections and names the missing ones", () => {
    const guide = parsePresetGuide("# Brewline\n\n## Suits\n\nCafés.\n\n## Look\n\nWarm.\n");
    expect(guide.title).toBe("Brewline");
    expect(guide.suits).toBe("Cafés.");
    expect(guide.look).toBe("Warm.");
    expect(guide.adapting).toBeNull();
    expect(guide.missing).toEqual(["Adapting"]);
    expect(PRESET_GUIDE_HEADINGS).toEqual(["Suits", "Look", "Adapting"]);
  });
});

describe("helpers", () => {
  it("collects backticked names outside code fences", () => {
    expect(backtickedNames(widgetGuide)).toEqual(["rich-text", "transparent_on_hero"]);
    expect(backtickedNames("use `a` and ``not this`` and `a` again")).toEqual(["a"]);
  });

  it("firstParagraph skips headings, tables, rules and lists", () => {
    expect(firstParagraph("# T\n\n| a |\n\n---\n\n- item\n\nHello\nthere.")).toBe("Hello there.");
    expect(firstParagraph("# only a title")).toBeNull();
  });

  it("clip cuts at a word boundary and marks the cut", () => {
    expect(clip("one two three", 20)).toBe("one two three");
    expect(clip("one two three four", 9)).toBe("one two…");
    expect(clip(null, 9)).toBeNull();
  });

  it("rejects a recipe with more than one example, valid or not", () => {
    const two = (second) => parseWidgetGuide(`# w

## Purpose

p

## When to use

w

## Recipes

### Two

\`\`\`json
{ "settings": {} }
\`\`\`

\`\`\`json
${second}
\`\`\`
`).recipes[0];
    for (const recipe of [two('{ "settings": {} }'), two("{ broken")]) {
      expect(recipe.example).toBeNull();
      expect(recipe.error).toMatch(/2 ```json examples/);
    }
  });
});
