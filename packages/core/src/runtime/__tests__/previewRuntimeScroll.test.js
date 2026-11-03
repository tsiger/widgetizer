// @vitest-environment jsdom
/**
 * The editor-mode runtime's side of keeping the view still: it reports where the
 * document is scrolled (the editor can't read that from a cross-origin frame)
 * and puts the view back itself after re-rendering a widget.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const posted = [];
let onLoad = [];
let scrollY = 0;

beforeAll(async () => {
  window.history.replaceState(null, "", `?parentOrigin=${encodeURIComponent(window.location.origin)}`);
  document.body.innerHTML = `<section data-widget-id="w1"><p>Before</p></section>`;
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
  window.scrollTo = vi.fn((_x, y) => {
    scrollY = y;
  });
  window.parent.postMessage = (data) => posted.push(data);
  await import("../previewRuntime.js");
  onLoad = posted.map((m) => m.type);
});

beforeEach(() => {
  posted.length = 0;
  window.scrollTo.mockClear();
});

const scrollReports = () => posted.filter((m) => m.type === "SCROLL_POSITION").map((m) => m.payload.scrollY);
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

describe("preview runtime scroll reporting", () => {
  it("reports the position once the document is ready", () => {
    expect(onLoad).toEqual(["PREVIEW_READY", "SCROLL_POSITION"]);
  });

  it("reports the position on scroll", async () => {
    scrollY = 640;
    window.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(scrollReports()).toEqual([640]);
  });
});

describe("preview runtime widget re-render", () => {
  it("keeps the view where it was when the swap moves the page", () => {
    scrollY = 300;
    const jump = () => {
      scrollY = 0;
    };
    document.addEventListener("widget:updated", jump, { once: true });
    expect(window.PreviewRuntime.morphWidget("w1", `<section data-widget-id="w1"><p>After</p></section>`)).toBe(true);
    expect(document.querySelector("[data-widget-id='w1']").textContent).toBe("After");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 300);
    expect(scrollY).toBe(300);
  });

  it("leaves the view alone when nothing moved", () => {
    scrollY = 120;
    window.PreviewRuntime.morphWidget("w1", `<section data-widget-id="w1"><p>Again</p></section>`);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
