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

// The target's language decides its folder; the rendering page's depth decides the
// prefix. A cross-language link is therefore plain prefixing.
describe("resolveMenuItemLinks — the target's language", () => {
  const multiPages = new Map([
    ["p-home", { slug: "index", language: "en" }],
    ["p-about", { slug: "about", language: "en" }],
    ["p-el-home", { slug: "index", language: "el" }],
    ["p-el-about", { slug: "about", language: "el" }],
  ]);
  const multiItems = new Map([
    ["i-en", { slugPrefix: "rooms", slug: "suite", language: "en" }],
    ["i-el", { slugPrefix: "rooms", slug: "suite", language: "el" }],
  ]);
  const crossItems = [
    { id: "1", label: "Home", pageUuid: "p-home" },
    { id: "2", label: "About", pageUuid: "p-about" },
    { id: "3", label: "Arxiki", pageUuid: "p-el-home" },
    { id: "4", label: "Sxetika", pageUuid: "p-el-about" },
    { id: "5", label: "Suite", collectionItemUuid: "i-en", collectionType: "rooms" },
    { id: "6", label: "Souita", collectionItemUuid: "i-el", collectionType: "rooms" },
  ];
  const resolve = (prefix, cleanUrls) =>
    resolveMenuItemLinks(crossItems, multiPages, prefix, multiItems, 1, cleanUrls, "en");

  it.each(["", "../", "../../"])("folders only the non-default language, from depth '%s'", (prefix) => {
    expect(resolve(prefix, false).map((i) => i.link)).toEqual([
      `${prefix}index.html`,
      `${prefix}about.html`,
      `${prefix}el/index.html`,
      `${prefix}el/about.html`,
      `${prefix}rooms/suite.html`,
      `${prefix}el/rooms/suite.html`,
    ]);
  });

  it.each(["", "../"])("keeps the Clean URLs shape per language, from depth '%s'", (prefix) => {
    expect(resolve(prefix, true).map((i) => i.link)).toEqual([
      prefix || "./",
      `${prefix}about`,
      `${prefix}el/`,
      `${prefix}el/about`,
      `${prefix}rooms/suite`,
      `${prefix}el/rooms/suite`,
    ]);
  });

  it("gives canonicalPath the file path of the target's language, under both shapes", () => {
    const expected = [
      "index.html",
      "about.html",
      "el/index.html",
      "el/about.html",
      "rooms/suite.html",
      "el/rooms/suite.html",
    ];
    expect(resolve("", false).map((i) => i.canonicalPath)).toEqual(expected);
    expect(resolve("../", true).map((i) => i.canonicalPath)).toEqual(expected);
  });

  it("reads the project's own default, so a Greek-default site puts English in a folder", () => {
    const out = resolveMenuItemLinks(crossItems, multiPages, "", multiItems, 1, false, "el");
    expect(out.map((i) => i.link)).toEqual([
      "en/index.html",
      "en/about.html",
      "index.html",
      "about.html",
      "en/rooms/suite.html",
      "rooms/suite.html",
    ]);
  });

  it("leaves a single-language map at the root whatever the default is", () => {
    const out = resolveMenuItemLinks(items, pagesByUuid, "", collectionItemsByUuid, 1, false, "el");
    expect(out.map((i) => i.link)).toEqual([
      "index.html",
      "about.html",
      "rooms/suite.html",
      "contact.html",
      "https://example.com/x.html",
    ]);
  });

  it("carries the default through resolveMenuSettings and into nested items", () => {
    const nested = [{ id: "n", label: "N", link: "", items: [{ id: "c", label: "C", pageUuid: "p-el-about" }] }];
    const menuMaps = { byUuid: new Map([["m1", { items: nested }]]), bySlug: new Map() };
    const settings = { nav: "m1" };
    resolveMenuSettings(settings, [{ type: "menu", id: "nav" }], {
      menuMaps,
      pagesByUuid: multiPages,
      collectionItemsByUuid: multiItems,
      outputPathPrefix: "../",
      cleanUrls: true,
      defaultLanguage: "en",
    });
    expect(settings.nav.items[0].items[0].link).toBe("../el/about");
    expect(settings.nav.items[0].items[0].canonicalPath).toBe("el/about.html");
  });
});

// A uuid names one menu anywhere. A bare SLUG is a legacy value that means
// "this language's menu of that name" — resolving it to the root menu on every
// language's page renders the default language's labels inside a translated
// header, which is what `bySlug` being root-only used to do.
describe("resolveMenuSettings resolves a bare slug within the language being rendered", () => {
  const rootMenu = { items: [{ id: "a", label: "English nav", link: "about.html" }] };
  const greekMenu = { items: [{ id: "a", label: "Greek nav", link: "sxetika.html" }] };
  const menuMaps = {
    byUuid: new Map([["u-el-main", greekMenu]]),
    bySlug: new Map([
      ["", new Map([["main", rootMenu]])],
      ["el", new Map([["main", greekMenu]])],
    ]),
  };
  const resolve = (value, language) => {
    const settings = { nav: value };
    resolveMenuSettings(settings, [{ type: "menu", id: "nav" }], {
      menuMaps,
      pagesByUuid,
      collectionItemsByUuid,
      outputPathPrefix: "",
      defaultLanguage: "en",
      language,
    });
    return settings.nav.items[0]?.label;
  };

  it("finds the language's own menu", () => {
    expect(resolve("main", "el")).toBe("Greek nav");
  });

  it("finds the root menu for the default language", () => {
    expect(resolve("main", "en")).toBe("English nav");
    expect(resolve("main", "")).toBe("English nav");
  });

  it("falls back to the root menu when the language has none of that name", () => {
    expect(resolve("main", "de")).toBe("English nav");
  });

  it("still lets a uuid name one menu from anywhere", () => {
    expect(resolve("u-el-main", "en")).toBe("Greek nav");
  });
});
