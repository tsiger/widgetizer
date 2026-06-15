/**
 * Rich-text (RTE) emptiness filters: `rte_text` and `rte_blank`.
 *
 * Richtext fields are never Liquid-`blank` when "empty" — the editor leaves
 * behind `<p></p>`, `<p><br></p>`, `<p>&nbsp;</p>`. These filters collapse that
 * markup so visibility/layout can key off real content presence.
 *
 * Run with: node --test server/tests/rteFilter.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Liquid } from "liquidjs";

import { registerRteFilters } from "../../src/core/filters/rteFilter.js";

const engine = new Liquid();
registerRteFilters(engine);

const text = (html) => engine.parseAndRenderSync("{{ html | rte_text }}", { html });
const blank = (html) => engine.parseAndRenderSync("{{ html | rte_blank }}", { html });

describe("rte_text filter", () => {
  it("collapses visually-empty markup to ''", () => {
    for (const html of ["<p></p>", "<p><br></p>", "<p>&nbsp;</p>", "<p>&#160;</p>", "<p>&#xA0;</p>", "   ", "<p>   </p>"]) {
      assert.equal(text(html), "", `expected '' for ${JSON.stringify(html)}`);
    }
  });

  it("strips tags and normalizes whitespace on real content", () => {
    assert.equal(text("<p>Hello <strong>world</strong></p>"), "Hello world");
    assert.equal(text("<p>One</p>\n<p>Two</p>"), "One Two");
    assert.equal(text("<p>  spaced   out  </p>"), "spaced out");
  });

  it("strips nbsp but leaves other entities untouched (parity with strip_html)", () => {
    // Only nbsp variants are removed; other entities are not decoded — matching
    // the original `strip_html | replace` chain this filter replaced.
    assert.equal(text("<p>&copy; 2026&nbsp;Acme</p>"), "&copy; 2026Acme");
  });

  it("returns '' for null / non-string input", () => {
    assert.equal(engine.parseAndRenderSync("{{ html | rte_text }}", {}), "");
    assert.equal(engine.parseAndRenderSync("{{ html | rte_text }}", { html: 42 }), "");
  });
});

describe("rte_blank filter", () => {
  it("is true for visually-empty richtext", () => {
    for (const html of ["", "<p></p>", "<p><br></p>", "<p>&nbsp;</p>", "<p>&#160;</p>", "<p>   </p>"]) {
      assert.equal(blank(html), "true", `expected true for ${JSON.stringify(html)}`);
    }
  });

  it("is false when real content is present", () => {
    for (const html of ["<p>hi</p>", "<p>&copy;</p>", "<ul><li>x</li></ul>"]) {
      assert.equal(blank(html), "false", `expected false for ${JSON.stringify(html)}`);
    }
  });

  it("is true for null / non-string input", () => {
    assert.equal(engine.parseAndRenderSync("{{ html | rte_blank }}", {}), "true");
    assert.equal(engine.parseAndRenderSync("{{ html | rte_blank }}", { html: null }), "true");
  });
});

describe("rte filters in conditions", () => {
  const render = (tpl, html) => engine.parseAndRenderSync(tpl, { html });

  it("unless rte_blank renders only when content is present", () => {
    const tpl = "{% unless html | rte_blank %}SHOW{% else %}HIDE{% endunless %}";
    assert.equal(render(tpl, "<p></p>"), "HIDE");
    assert.equal(render(tpl, "<p>real</p>"), "SHOW");
  });

  it("if rte_blank takes the empty branch", () => {
    const tpl = "{% if html | rte_blank %}EMPTY{% else %}FULL{% endif %}";
    assert.equal(render(tpl, "<p>&nbsp;</p>"), "EMPTY");
    assert.equal(render(tpl, "<p>real</p>"), "FULL");
  });
});
