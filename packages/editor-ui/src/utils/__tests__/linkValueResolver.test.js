import { describe, it, expect } from "vitest";
import { resolveStoredLink } from "../linkValueResolver";

const optionsByUuid = new Map([
  ["page-1", { value: "page-1", isPage: true, slug: "about" }],
  ["item-1", { value: "item-1", isCollectionItem: true, collectionType: "rooms", slugPrefix: "rooms", slug: "suite" }],
]);
const pageOptionBySlug = new Map([["about", { value: "page-1", isPage: true, slug: "about" }]]);

describe("resolveStoredLink", () => {
  it("returns the value untouched while options are loading", () => {
    const v = { collectionItemUuid: "item-1", href: "stale.html", text: "T", target: "_self" };
    expect(resolveStoredLink(v, optionsByUuid, pageOptionBySlug, true)).toBe(v);
  });

  it("resolves a collectionItemUuid to the item's current slug href", () => {
    const out = resolveStoredLink(
      { collectionItemUuid: "item-1", href: "rooms/old.html", text: "Suite", target: "_blank" },
      optionsByUuid,
      pageOptionBySlug,
      false,
    );
    expect(out).toEqual({
      collectionType: "rooms",
      collectionItemUuid: "item-1",
      href: "rooms/suite.html",
      text: "Suite",
      target: "_blank",
    });
  });

  it("resolves a pageUuid to the page's current slug href", () => {
    const out = resolveStoredLink(
      { pageUuid: "page-1", href: "old.html", text: "About", target: "_self" },
      optionsByUuid,
      pageOptionBySlug,
      false,
    );
    expect(out).toEqual({ pageUuid: "page-1", href: "about.html", text: "About", target: "_self" });
  });

  // P1 regression guard: a stable ref absent from the (stale/partial) options must
  // be PRESERVED, not cleared — otherwise editing only text/target drops it.
  it("preserves a collectionItemUuid ref absent from options (no false-clear)", () => {
    const v = {
      collectionType: "rooms",
      collectionItemUuid: "item-missing",
      href: "rooms/suite.html",
      text: "Suite",
      target: "_self",
    };
    expect(resolveStoredLink(v, optionsByUuid, pageOptionBySlug, false)).toBe(v);
  });

  it("preserves a pageUuid ref absent from options (no false-clear)", () => {
    const v = { pageUuid: "page-missing", href: "about.html", text: "About", target: "_self" };
    expect(resolveStoredLink(v, optionsByUuid, pageOptionBySlug, false)).toBe(v);
  });

  it("matches a slug-only internal href to a page uuid", () => {
    const out = resolveStoredLink(
      { href: "about.html", text: "About", target: "_self" },
      optionsByUuid,
      pageOptionBySlug,
      false,
    );
    expect(out).toEqual({ pageUuid: "page-1", href: "about.html", text: "About", target: "_self" });
  });

  it("passes a custom URL through unchanged", () => {
    const out = resolveStoredLink(
      { href: "https://x.com", text: "X", target: "_blank" },
      optionsByUuid,
      pageOptionBySlug,
      false,
    );
    expect(out).toEqual({ href: "https://x.com", text: "X", target: "_blank" });
  });
});
