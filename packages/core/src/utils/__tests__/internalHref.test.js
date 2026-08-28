import { describe, it, expect } from "vitest";
import { isHomeSlug, pageHref, itemHref } from "../internalHref.js";

describe("isHomeSlug", () => {
  it("recognises the two home slugs only", () => {
    expect(isHomeSlug("index")).toBe(true);
    expect(isHomeSlug("home")).toBe(true);
    expect(isHomeSlug("about")).toBe(false);
    expect(isHomeSlug("")).toBe(false);
    expect(isHomeSlug(undefined)).toBe(false);
  });
});

describe("pageHref — flag OFF (byte-identical to today)", () => {
  it("emits <slug>.html at the root", () => {
    expect(pageHref("about")).toBe("about.html");
    expect(pageHref("index")).toBe("index.html");
    expect(pageHref("home")).toBe("home.html");
  });
  it("depth-prefixes one level deep", () => {
    expect(pageHref("about", { outputPathPrefix: "../" })).toBe("../about.html");
    expect(pageHref("index", { outputPathPrefix: "../" })).toBe("../index.html");
  });
});

describe("pageHref — flag ON", () => {
  it("drops the extension", () => {
    expect(pageHref("about", { cleanUrls: true })).toBe("about");
    expect(pageHref("about", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../about");
  });
  it("home is ./ at the root and exactly ../ one level deep (never .././ or index)", () => {
    expect(pageHref("index", { cleanUrls: true })).toBe("./");
    expect(pageHref("home", { cleanUrls: true })).toBe("./");
    expect(pageHref("index", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../");
  });
});

describe("itemHref", () => {
  it("OFF keeps .html; ON drops it; both depth-prefix", () => {
    expect(itemHref("rooms", "suite")).toBe("rooms/suite.html");
    expect(itemHref("rooms", "suite", { outputPathPrefix: "../" })).toBe("../rooms/suite.html");
    expect(itemHref("rooms", "suite", { cleanUrls: true })).toBe("rooms/suite");
    expect(itemHref("rooms", "suite", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../rooms/suite");
  });
  it("an item slugged index/home is an ordinary item address, never the site root", () => {
    expect(itemHref("rooms", "index", { cleanUrls: true })).toBe("rooms/index");
    expect(itemHref("rooms", "home", { cleanUrls: true })).toBe("rooms/home");
    expect(itemHref("rooms", "index", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../rooms/index");
    expect(itemHref("rooms", "index")).toBe("rooms/index.html");
  });
});
