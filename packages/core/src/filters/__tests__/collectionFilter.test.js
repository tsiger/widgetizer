import { describe, it, expect } from "vitest";
import { Liquid } from "liquidjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerCollectionFilter, normalizeCollectionFilterArgs } from "../collectionFilter.js";

// The loader itself is covered end-to-end over a real storage adapter in
// packages/builder-server/src/tests/collectionFilter.test.js. These cases pin
// only how the filter REACHES that loader through the Liquid scopes, with the
// bag passed both ways the engine passes it (as the render environment and as
// LiquidJS's `globals` option).
function renderWithSnippet(snippet, template, globals) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "collection-filter-"));
  fs.writeFileSync(path.join(root, "snippet.liquid"), snippet);
  const engine = new Liquid({ root: [root], extname: ".liquid", outputEscape: "escape" });
  registerCollectionFilter(engine);
  try {
    return engine.parseAndRenderSync(template, { globals }, { globals });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const LISTING = "{% assign items = 'news' | collection %}[{{ items.size }}]";
const withLoader = () => ({ getCollectionItems: () => [{ slug: "a" }, { slug: "b" }] });

// `{% render %}` isolates the environment scope, so a filter reading only
// `globals.getCollectionItems` finds nothing inside a snippet and returns an
// empty list — a listing that silently renders nothing, with no error. A shared
// listing snippet pulled into several widgets is the obvious thing to write, so
// both snippet forms must see the same items as the top level.
describe("collection filter — snippet scope", () => {
  for (const tag of ["render", "include"]) {
    it(`a ${tag}'d snippet sees the same items as the top level`, () => {
      const out = renderWithSnippet(LISTING, `${LISTING}##{% ${tag} 'snippet' %}`, withLoader());
      const [top, inSnippet] = out.split("##");
      expect(top).toBe("[2]");
      expect(inSnippet).toBe(top);
    });
  }

  it("still returns an empty list when no loader is wired at all", () => {
    expect(renderWithSnippet(LISTING, `{% render 'snippet' %}`, {})).toBe("[0]");
  });
});

describe("normalizeCollectionFilterArgs", () => {
  it("keeps known options from keyword objects and positional tuples", () => {
    expect(normalizeCollectionFilterArgs([{ limit: 6, sort: "created_desc" }])).toEqual({
      limit: 6,
      sort: "created_desc",
    });
    expect(normalizeCollectionFilterArgs([["limit", 3]])).toEqual({ limit: 3 });
  });

  it("drops unknown options", () => {
    expect(normalizeCollectionFilterArgs([{ limit: 2, nope: 1 }])).toEqual({ limit: 2 });
    expect(normalizeCollectionFilterArgs([["nope", 1]])).toEqual({});
  });
});
