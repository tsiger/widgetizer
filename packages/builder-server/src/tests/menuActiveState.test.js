/**
 * Menu snippet active-state (D3 / canonical-path matching).
 *
 * The menu snippet must mark the active item by comparing the un-prefixed
 * `currentCanonicalPath` global against each item's un-prefixed `canonicalPath`
 * — NOT the depth-prefixed emitted `link`. This keeps `is-active`/`aria-current`
 * working on collection-item pages and any nested-depth render, where `item.link`
 * carries a `../` prefix that the bare current path never equals.
 *
 * Renders the real core snippet through a Liquid engine configured like the
 * render engine, with `currentCanonicalPath` supplied as a global (as the engine
 * does) and `menu` passed as a render arg.
 *
 * Run with: node --test packages/builder-server/src/tests/menuActiveState.test.js
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Liquid } from "liquidjs";

const CORE_SNIPPETS_DIR = fileURLToPath(new URL("../../../core/src/snippets", import.meta.url));

let engine;
before(() => {
  engine = new Liquid({
    extname: ".liquid",
    root: [CORE_SNIPPETS_DIR],
    partials: [CORE_SNIPPETS_DIR],
    outputEscape: "escape",
  });
});

/** Render the `menu` snippet with `currentCanonicalPath` as a global. */
function renderMenu(menu, currentCanonicalPath) {
  return engine.parseAndRender(
    "{% render 'menu', menu: menu, skip_nav: true %}",
    { menu },
    { globals: { currentCanonicalPath } },
  );
}

/** The <li> markup for the item whose <a> contains `label`. */
function liFor(html, label) {
  // Each item is one <li ...> ... <a ...>label</a>. Grab the <li> opening tag
  // that precedes this label, plus the matching <a> tag.
  const aMatch = html.match(new RegExp(`<a[^>]*>\\s*${label}\\s*</a>`));
  assert.ok(aMatch, `expected an <a> for "${label}" in:\n${html}`);
  // Walk back to the nearest preceding <li ...>
  const before = html.slice(0, aMatch.index);
  const liOpen = before.lastIndexOf("<li");
  const liTag = before.slice(liOpen, before.indexOf(">", liOpen) + 1);
  return { liTag, aTag: aMatch[0] };
}

describe("menu snippet — active state by canonicalPath", () => {
  it("marks the active item on a regular (root-depth) page", async () => {
    const menu = {
      items: [
        { label: "Home", link: "index.html", canonicalPath: "index.html" },
        { label: "About", link: "about.html", canonicalPath: "about.html" },
      ],
    };
    const html = await renderMenu(menu, "about.html");

    const about = liFor(html, "About");
    assert.ok(about.liTag.includes("is-active"), "About <li> should be active");
    assert.ok(about.aTag.includes('aria-current="page"'), "About <a> should be aria-current");

    const home = liFor(html, "Home");
    assert.ok(!home.liTag.includes("is-active"), "Home <li> should not be active");
    assert.ok(!home.aTag.includes("aria-current"), "Home <a> should not be aria-current");
  });

  it("matches by canonicalPath at item-page depth, despite prefixed links", async () => {
    // Rendered from portfolio/alpha/ — links carry a "../" prefix.
    const menu = {
      items: [
        { label: "Project Alpha", link: "../portfolio/alpha.html", canonicalPath: "portfolio/alpha.html" },
        { label: "About", link: "../about.html", canonicalPath: "about.html" },
      ],
    };
    const html = await renderMenu(menu, "portfolio/alpha.html");

    const alpha = liFor(html, "Project Alpha");
    assert.ok(alpha.liTag.includes("is-active"), "current item-page entry should be active");
    assert.ok(alpha.aTag.includes('aria-current="page"'), "current item-page entry should be aria-current");
    // The emitted href must remain the depth-prefixed link, not the canonicalPath.
    assert.ok(alpha.aTag.includes('href="../portfolio/alpha.html"'), "href should use the prefixed link");

    const about = liFor(html, "About");
    assert.ok(!about.liTag.includes("is-active"), "non-current entry should not be active");
  });

  it("marks an active nested subitem by canonicalPath", async () => {
    const menu = {
      items: [
        {
          label: "Work",
          link: "work.html",
          canonicalPath: "work.html",
          items: [{ label: "Alpha", link: "../portfolio/alpha.html", canonicalPath: "portfolio/alpha.html" }],
        },
      ],
    };
    const html = await renderMenu(menu, "portfolio/alpha.html");
    const alpha = liFor(html, "Alpha");
    assert.ok(alpha.liTag.includes("is-active"), "active subitem should be marked");
    assert.ok(alpha.aTag.includes('aria-current="page"'), "active subitem should be aria-current");
  });

  it("marks nothing active when no item matches", async () => {
    const menu = {
      items: [
        { label: "Home", link: "index.html", canonicalPath: "index.html" },
        { label: "About", link: "about.html", canonicalPath: "about.html" },
      ],
    };
    const html = await renderMenu(menu, "contact.html");
    assert.ok(!html.includes("is-active"), "no item should be active");
    assert.ok(!html.includes("aria-current"), "no item should be aria-current");
  });
});
