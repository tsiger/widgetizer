// @vitest-environment jsdom
/**
 * Links to a section in the standalone (Site) preview. The preview's <base> points
 * at the project's files, so the browser can't follow `#section` itself: the
 * runtime shows the section on the page on screen, and sends any other page's
 * section along with the navigation.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const posted = [];
const scrolledTo = [];

beforeAll(async () => {
  document.body.innerHTML = `
    <section id="testimonials"><p>Reviews</p></section>
    <section id="café"><p>Coffee</p></section>
    <a id="bare" href="#testimonials">bare</a>
    <a id="encoded" href="#caf%C3%A9">encoded</a>
    <a id="missing" href="#nowhere">missing</a>
    <a id="same-page" href="index.html#testimonials">same page</a>
    <a id="other-page" href="about.html#our-team">other page</a>
    <a id="plain" href="about.html">plain</a>
    <a id="other-language" href="el/index.html#testimonials">other language</a>
    <script type="module" data-preview-mode="standalone" data-languages="el" data-default-language="en" data-output-path="index.html"></script>`;
  Element.prototype.scrollIntoView = vi.fn(function scrollIntoView() {
    scrolledTo.push(this.id);
  });
  window.parent.postMessage = (data) => posted.push(data);
  await import("../previewRuntime.js");
});

beforeEach(() => {
  posted.length = 0;
  scrolledTo.length = 0;
});

const click = (id) => document.getElementById(id).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const navigations = () => posted.filter((m) => m.type === "NAVIGATE_PREVIEW").map((m) => m.payload);

describe("standalone preview: links to a section", () => {
  it("scrolls to and focuses a bare #section on this page, without navigating", () => {
    click("bare");
    expect(scrolledTo).toEqual(["testimonials"]);
    expect(document.activeElement.id).toBe("testimonials");
    expect(document.getElementById("testimonials").getAttribute("tabindex")).toBe("-1");
    expect(navigations()).toEqual([]);
  });

  it("finds a section whose id the link spells percent-encoded", () => {
    click("encoded");
    expect(scrolledTo).toEqual(["café"]);
  });

  it("does nothing for a section the page doesn't have", () => {
    click("missing");
    expect(scrolledTo).toEqual([]);
    expect(navigations()).toEqual([]);
  });

  it("scrolls in place when the link names this page with a #section", () => {
    click("same-page");
    expect(scrolledTo).toEqual(["testimonials"]);
    expect(navigations()).toEqual([]);
  });

  it("sends another page's #section along with the navigation", () => {
    click("other-page");
    expect(navigations()).toEqual([{ url: "/preview/page/en/about", fragment: "our-team" }]);
    expect(scrolledTo).toEqual([]);
  });

  it("navigates as before when the link names no section", () => {
    click("plain");
    expect(navigations()).toEqual([{ url: "/preview/page/en/about" }]);
  });

  it("treats the same page in another language as another page", () => {
    click("other-language");
    expect(navigations()).toEqual([{ url: "/preview/page/el/index", fragment: "testimonials" }]);
  });
});
