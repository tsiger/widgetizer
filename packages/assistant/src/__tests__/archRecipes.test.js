import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseWidgetGuide } from "@widgetizer/core/guidance";
import { applySectionOperations } from "../edits/sections.js";

// Every recipe Arch ships must be applicable the way section_details tells the
// assistant to apply it: a page section added whole, a header or footer changed
// in place. The theme checker validates recipes against the schema; this proves
// the assistant's own edit path accepts them too.

const ARCH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../themes/arch/widgets");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const widgetDirs = [
  ...fs
    .readdirSync(ARCH)
    .filter((name) => name !== "global")
    .map((name) => ({ dir: path.join(ARCH, name), global: false })),
  { dir: path.join(ARCH, "global", "header"), global: true },
  { dir: path.join(ARCH, "global", "footer"), global: true },
];

const schemas = new Map(widgetDirs.map(({ dir }) => {
  const schema = readJson(path.join(dir, "schema.json"));
  return [schema.type, schema];
}));

function recipeCases() {
  const cases = [];
  for (const { dir, global } of widgetDirs) {
    const file = path.join(dir, "insights.md");
    if (!fs.existsSync(file)) continue;
    const type = path.basename(dir);
    for (const recipe of parseWidgetGuide(fs.readFileSync(file, "utf8")).recipes) {
      cases.push({ type, global, recipe });
    }
  }
  return cases;
}

const cases = recipeCases();

function apply({ type, global, recipe }) {
  const example = { type, ...recipe.example };
  if (!global) {
    return applySectionOperations({
      doc: { slug: "test", widgets: {}, widgetsOrder: [] },
      kind: "page",
      schemas,
      operations: [{ op: "add", type, settings: example.settings, ...(example.blocks ? { blocks: example.blocks } : {}) }],
    });
  }
  // As the global instructions say: update the part's settings, then build its blocks.
  return applySectionOperations({
    doc: { type, settings: {}, blocks: {}, blocksOrder: [] },
    kind: "global",
    schemas,
    operations: [
      { op: "update", settings: example.settings ?? {} },
      ...(example.blocks ?? []).map((block) => ({ op: "addBlock", type: block.type, settings: block.settings })),
    ],
  });
}

describe("Arch recipes through the assistant's edit path", () => {
  it("finds recipes in every widget, the header and the footer", () => {
    expect(cases.length).toBeGreaterThan(150);
    expect(cases.some((entry) => entry.type === "header")).toBe(true);
    expect(cases.some((entry) => entry.type === "footer")).toBe(true);
  });

  it.each(cases.map((entry) => [`${entry.type}: ${entry.recipe.name}`, entry]))("%s applies", (_, entry) => {
    expect(entry.recipe.error).toBeNull();
    expect(() => apply(entry)).not.toThrow();
  });
});
