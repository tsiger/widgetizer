// @vitest-environment jsdom
/**
 * The editor preview runtime around a native video player. A click on the
 * player must keep its default action (that is where play/pause and seeking
 * happen) while still selecting the widget, and re-rendering the widget must
 * not load its script again each time.
 */
import { beforeAll, describe, expect, it } from "vitest";

const widgetHtml = (src) => `
  <section data-widget-id="w1" data-widget-type="video-embed">
    <p class="heading">Watch</p>
    <video class="video-embed-player" src="${src}" controls></video>
  </section>
  <script src="/api/preview/assets/p1/widgets/video-embed/video-embed.js" defer></script>`;

const selections = [];

beforeAll(async () => {
  // No script tag on first load, as when the widget started out as a YouTube embed.
  document.body.innerHTML = widgetHtml("/uploads/a.mp4").replace(/<script[^>]*><\/script>/, "");
  window.parent.postMessage = (data) => {
    if (data?.type === "WIDGET_SELECTED") selections.push(data.payload.widgetId);
  };
  await import("../previewRuntime.js");
});

function click(target) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("preview runtime with a native video", () => {
  it("lets a click on the player through, and still selects the widget", () => {
    selections.length = 0;
    expect(click(document.querySelector("video")).defaultPrevented).toBe(false);
    expect(selections).toEqual(["w1"]);
  });

  it("still swallows a click on the widget's ordinary content", () => {
    expect(click(document.querySelector(".heading")).defaultPrevented).toBe(true);
  });

  it("loads a widget's script once however many times the widget is re-rendered", () => {
    for (const src of ["/uploads/b.mp4", "/uploads/c.mp4", "/uploads/d.mp4"]) {
      window.PreviewRuntime.morphWidget("w1", widgetHtml(src));
    }
    const scripts = [...document.querySelectorAll("script[src]")].filter((s) => s.src.endsWith("video-embed.js"));
    expect(scripts).toHaveLength(1);
    expect(document.querySelector("video").getAttribute("src")).toBe("/uploads/d.mp4");
  });

  it("loads a relative script from the document's <base>, once", () => {
    const base = document.createElement("base");
    base.href = "/tenant/p/";
    document.head.appendChild(base);
    try {
      const html = `<section data-widget-id="w1"></section><script src="assets/clip.js?v=1" defer></script>`;
      for (let i = 0; i < 3; i++) window.PreviewRuntime.morphWidget("w1", html);
      const scripts = [...document.querySelectorAll("script[src]")].filter((s) => s.src.includes("clip.js"));
      expect(scripts.map((s) => new URL(s.src).pathname + new URL(s.src).search)).toEqual(["/tenant/p/assets/clip.js?v=1"]);
    } finally {
      base.remove();
    }
  });
});
