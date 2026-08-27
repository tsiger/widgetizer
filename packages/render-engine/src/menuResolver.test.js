import { describe, it, expect } from "vitest";
import { resolveMenuItemLinks, resolveMenuSettings } from "./menuResolver.js";

const pagesByUuid = new Map([
  ["p-home", { slug: "index" }],
  ["p-about", { slug: "about" }],
]);
const collectionItemsByUuid = new Map([["i-suite", { slugPrefix: "rooms", slug: "suite" }]]);

const items = [
  { id: "1", label: "Home", link: "index.html", pageUuid: "p-home" },
  { id: "2", label: "About", link: "about.html", pageUuid: "p-about" },
  { id: "3", label: "Suite", link: "rooms/old.html", collectionItemUuid: "i-suite", collectionType: "rooms" },
  { id: "4", label: "Typed", link: "contact.html" },
  { id: "5", label: "Ext", link: "https://example.com/x.html" },
];

describe("resolveMenuItemLinks — flag OFF is unchanged", () => {
  it("emits .html links and .html canonicalPath", () => {
    const out = resolveMenuItemLinks(items, pagesByUuid, "", collectionItemsByUuid);
    expect(out.map((i) => i.link)).toEqual(["index.html", "about.html", "rooms/suite.html", "contact.html", "https://example.com/x.html"]);
    expect(out.map((i) => i.canonicalPath)).toEqual(["index.html", "about.html", "rooms/suite.html", "contact.html", "https://example.com/x.html"]);
  });
});

describe("resolveMenuItemLinks — flag ON", () => {
  it("emits extensionless links for uuid-resolved items, home as ./, typed links untouched", () => {
    const out = resolveMenuItemLinks(items, pagesByUuid, "", collectionItemsByUuid, 1, true);
    expect(out.map((i) => i.link)).toEqual(["./", "about", "rooms/suite", "contact.html", "https://example.com/x.html"]);
  });
  it("keeps canonicalPath in the .html form so active-state matching is unchanged", () => {
    const out = resolveMenuItemLinks(items, pagesByUuid, "", collectionItemsByUuid, 1, true);
    expect(out.map((i) => i.canonicalPath)).toEqual(["index.html", "about.html", "rooms/suite.html", "contact.html", "https://example.com/x.html"]);
  });
  it("depth-prefixes: home is exactly ../ from an item page", () => {
    const out = resolveMenuItemLinks(items, pagesByUuid, "../", collectionItemsByUuid, 1, true);
    expect(out.map((i) => i.link)).toEqual(["../", "../about", "../rooms/suite", "../contact.html", "https://example.com/x.html"]);
  });
  it("recurses into children with the same flag", () => {
    const nested = [{ id: "n", label: "N", link: "", items: [{ id: "c", label: "C", link: "about.html", pageUuid: "p-about" }] }];
    const out = resolveMenuItemLinks(nested, pagesByUuid, "", collectionItemsByUuid, 1, true);
    expect(out[0].items[0].link).toBe("about");
  });
});

describe("resolveMenuSettings passes cleanUrls through", () => {
  it("resolves a menu setting's items extensionless when deps.cleanUrls is true", () => {
    const menuMaps = { byUuid: new Map([["m1", { items }]]), bySlug: new Map() };
    const settings = { nav: "m1" };
    resolveMenuSettings(settings, [{ type: "menu", id: "nav" }], { menuMaps, pagesByUuid, collectionItemsByUuid, outputPathPrefix: "", cleanUrls: true });
    expect(settings.nav.items[1].link).toBe("about");
    expect(settings.nav.items[1].canonicalPath).toBe("about.html");
  });
});
