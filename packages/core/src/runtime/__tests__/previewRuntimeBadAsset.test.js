// @vitest-environment jsdom
/**
 * A widget re-render whose stylesheets include an address the browser cannot
 * parse: a link written in the widget's own markup (pasted embed code, a broken
 * theme template). Enqueued files always get a valid preview address, but the
 * morph collects every stylesheet link in the response. The bad one is left
 * out, as a full page load would fail to load it; the rest of the update still
 * applies.
 */
import { beforeAll, describe, expect, it } from "vitest";

const EDITOR = window.location.origin;
const posted = [];

beforeAll(async () => {
  window.history.replaceState(null, "", `?parentOrigin=${encodeURIComponent(EDITOR)}`);
  document.body.innerHTML = `<section data-widget-id="w1"><p>old</p></section>`;
  window.parent.postMessage = (data) => posted.push(data?.type);
  await import("../previewRuntime.js");
});

describe("preview runtime, an asset address that is missing or can't be parsed", () => {
  it("skips that asset and finishes the update", () => {
    const updated = [];
    document.addEventListener("widget:updated", (e) => updated.push(e.detail.widgetId));
    const html = `
      <section data-widget-id="w1"><p>new</p><link rel="stylesheet" href="http://[bad.example/x.css"></section>
      <link rel="stylesheet">
      <script src="http://[bad.example/x.js"></script>
      <link rel="stylesheet" href="/assets/good.css">
      <script src="/assets/good.js"></script>`;

    // The editor's own message, so a failed morph would be reported to it.
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "MORPH_WIDGET", payload: { widgetId: "w1", html } }, origin: EDITOR }),
    );

    expect(posted).not.toContain("WIDGET_MORPH_FAILED");
    const widget = document.querySelector('[data-widget-id="w1"]');
    expect(widget.querySelector("p").textContent).toBe("new");
    expect(widget.dataset.initialized).toBe("true");
    expect(updated).toEqual(["w1"]);
    const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src"));
    expect(scripts.some((src) => src.endsWith("/assets/good.js"))).toBe(true);
    expect(scripts.some((src) => src.includes("bad.example"))).toBe(false);
    expect([...document.head.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute("href"))).toEqual([
      "/assets/good.css",
    ]);
  });
});
