/**
 * Phase 16 — depth-aware menu/link prefixing + canonicalPath.
 *
 * In publish mode every emitted link is depth-aware (prefixed with
 * `outputPathPrefix`), while menu items also carry an un-prefixed
 * `canonicalPath` so active-state matching survives the prefixing.
 *
 * Run with: node --test server/tests/linkMenuPrefixing.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveLinkValue } from "../services/renderingService.js";
import { resolveMenuItemLinks, resolveMenuPageLinks } from "../services/menuResolver.js";

const pagesByUuid = new Map([["uuid-about", { uuid: "uuid-about", slug: "about" }]]);

describe("resolveLinkValue — depth-aware pageUuid href", () => {
  it("resolves pageUuid to slug.html at the root", () => {
    const out = resolveLinkValue({ pageUuid: "uuid-about", text: "About" }, pagesByUuid, "");
    assert.equal(out.href, "about.html");
  });

  it("prefixes the resolved href at depth-1", () => {
    const out = resolveLinkValue({ pageUuid: "uuid-about", text: "About" }, pagesByUuid, "../");
    assert.equal(out.href, "../about.html");
  });

  it("clears a deleted-page link", () => {
    const out = resolveLinkValue({ pageUuid: "missing", text: "Gone" }, pagesByUuid, "../");
    assert.deepEqual(out, { href: "", text: "", target: "_self" });
  });

  it("passes a non-link value through untouched", () => {
    assert.equal(resolveLinkValue("nope", pagesByUuid, "../"), "nope");
  });
});

const collectionItemsByUuid = new Map([["item-1", { slugPrefix: "portfolio", slug: "alpha" }]]);

describe("resolveLinkValue — depth-aware collectionItemUuid href (#11 parity)", () => {
  it("resolves collectionItemUuid to slugPrefix/slug.html at the root", () => {
    const out = resolveLinkValue(
      { collectionItemUuid: "item-1", collectionType: "portfolio", text: "Alpha" },
      pagesByUuid,
      "",
      collectionItemsByUuid,
    );
    assert.equal(out.href, "portfolio/alpha.html");
  });

  it("prefixes the resolved item href at depth-1", () => {
    const out = resolveLinkValue(
      { collectionItemUuid: "item-1", text: "Alpha" },
      pagesByUuid,
      "../",
      collectionItemsByUuid,
    );
    assert.equal(out.href, "../portfolio/alpha.html");
  });

  it("clears a deleted-item link", () => {
    const out = resolveLinkValue(
      { collectionItemUuid: "missing", text: "Gone" },
      pagesByUuid,
      "../",
      collectionItemsByUuid,
    );
    assert.deepEqual(out, { href: "", text: "", target: "_self" });
  });
});

describe("resolveMenuItemLinks — link prefixing + canonicalPath", () => {
  it("pageUuid item: root link un-prefixed, canonicalPath set", () => {
    const [item] = resolveMenuItemLinks([{ pageUuid: "uuid-about", label: "About" }], pagesByUuid, "");
    assert.equal(item.link, "about.html");
    assert.equal(item.canonicalPath, "about.html");
  });

  it("pageUuid item: depth-1 link prefixed, canonicalPath stays un-prefixed", () => {
    const [item] = resolveMenuItemLinks([{ pageUuid: "uuid-about", label: "About" }], pagesByUuid, "../");
    assert.equal(item.link, "../about.html");
    assert.equal(item.canonicalPath, "about.html");
  });

  it("custom URL item: prefixed at depth, canonicalPath normalized", () => {
    const root = resolveMenuItemLinks([{ link: "contact.html", label: "Contact" }], pagesByUuid, "");
    assert.equal(root[0].link, "contact.html");
    assert.equal(root[0].canonicalPath, "contact.html");

    const deep = resolveMenuItemLinks([{ link: "contact.html", label: "Contact" }], pagesByUuid, "../");
    assert.equal(deep[0].link, "../contact.html");
    assert.equal(deep[0].canonicalPath, "contact.html");
  });

  it("external custom URL is never prefixed", () => {
    const [item] = resolveMenuItemLinks([{ link: "https://x.com", label: "X" }], pagesByUuid, "../");
    assert.equal(item.link, "https://x.com");
    assert.equal(item.canonicalPath, "https://x.com");
  });

  it("blocks dangerous-protocol custom URLs (incl. obfuscated)", () => {
    for (const link of ["javascript:alert(1)", "java\tscript:alert(1)", "\x01javascript:alert(1)"]) {
      const [item] = resolveMenuItemLinks([{ link, label: "Evil" }], pagesByUuid, "");
      assert.equal(item.link, "", `expected blocked link for ${JSON.stringify(link)}`);
    }
  });

  it("padded custom URL: rendered prefixed/cleaned at depth, canonicalPath trimmed", () => {
    const [item] = resolveMenuItemLinks([{ link: "  about.html  ", label: "About" }], pagesByUuid, "../");
    assert.equal(item.link, "../about.html");
    assert.equal(item.canonicalPath, "about.html");
  });

  it("still processes custom URLs when pagesByUuid is empty (no short-circuit)", () => {
    const [item] = resolveMenuItemLinks([{ link: "contact.html", label: "Contact" }], new Map(), "../");
    assert.equal(item.link, "../contact.html");
    assert.equal(item.canonicalPath, "contact.html");
  });

  it("resolves nested children recursively", () => {
    const [parent] = resolveMenuItemLinks(
      [{ label: "Parent", link: "p.html", items: [{ pageUuid: "uuid-about", label: "About" }] }],
      pagesByUuid,
      "../",
    );
    assert.equal(parent.items[0].link, "../about.html");
    assert.equal(parent.items[0].canonicalPath, "about.html");
  });

  it("deleted-page item: link and canonicalPath cleared, pageUuid dropped", () => {
    const [item] = resolveMenuItemLinks([{ pageUuid: "missing", label: "Gone" }], pagesByUuid, "../");
    assert.equal(item.link, "");
    assert.equal(item.canonicalPath, "");
    assert.equal("pageUuid" in item, false);
  });

  it("collectionItemUuid item: resolves to the item's page URL (root + depth) (#11)", () => {
    const itemsByUuid = new Map([["uuid-room-1", { slugPrefix: "rooms", slug: "suite-caldera" }]]);
    const mk = () => [{ collectionItemUuid: "uuid-room-1", collectionType: "accommodation", label: "Suite" }];

    const [root] = resolveMenuItemLinks(mk(), pagesByUuid, "", itemsByUuid);
    assert.equal(root.link, "rooms/suite-caldera.html");
    assert.equal(root.canonicalPath, "rooms/suite-caldera.html");

    const [deep] = resolveMenuItemLinks(mk(), pagesByUuid, "../", itemsByUuid);
    assert.equal(deep.link, "../rooms/suite-caldera.html");
    assert.equal(deep.canonicalPath, "rooms/suite-caldera.html");
  });

  it("deleted collection-item ref: link/canonicalPath cleared, stable fields dropped (#11)", () => {
    const [item] = resolveMenuItemLinks(
      [{ collectionItemUuid: "gone", collectionType: "accommodation", label: "X" }],
      pagesByUuid,
      "../",
      new Map(),
    );
    assert.equal(item.link, "");
    assert.equal(item.canonicalPath, "");
    assert.equal("collectionItemUuid" in item, false);
    assert.equal("collectionType" in item, false);
  });
});

describe("resolveMenuPageLinks", () => {
  it("threads outputPathPrefix into items", () => {
    const out = resolveMenuPageLinks({ items: [{ pageUuid: "uuid-about", label: "About" }] }, pagesByUuid, "../");
    assert.equal(out.items[0].link, "../about.html");
    assert.equal(out.items[0].canonicalPath, "about.html");
  });

  it("returns falsy menuData untouched", () => {
    assert.equal(resolveMenuPageLinks(null, pagesByUuid, "../"), null);
  });
});
