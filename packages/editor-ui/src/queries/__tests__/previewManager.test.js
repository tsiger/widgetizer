// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the fetch layer so we can inspect the request the morph path sends.
vi.mock("../../lib/apiFetch", () => ({
  editorFetch: vi.fn(),
  editorFetchJson: vi.fn(),
  rethrowQueryError: vi.fn((err) => {
    throw err;
  }),
  throwApiError: vi.fn(),
}));

import { fetchRenderedWidget, updatePreview } from "../previewManager";
import { editorFetch } from "../../lib/apiFetch";

afterEach(() => {
  vi.clearAllMocks();
});

describe("fetchRenderedWidget — currentCanonicalPath forwarding (D3)", () => {
  it("includes currentCanonicalPath in the /preview/widget request body", async () => {
    editorFetch.mockResolvedValue({ ok: true, text: async () => "<div>ok</div>" });

    await fetchRenderedWidget("header", { type: "x" }, { color: "red" }, "portfolio/alpha.html");

    expect(editorFetch).toHaveBeenCalledTimes(1);
    const [path, options] = editorFetch.mock.calls[0];
    expect(path).toBe("/preview/widget");
    const body = JSON.parse(options.body);
    expect(body.currentCanonicalPath).toBe("portfolio/alpha.html");
    expect(body.widgetId).toBe("header");
  });

  it("defaults currentCanonicalPath to an empty string when omitted", async () => {
    editorFetch.mockResolvedValue({ ok: true, text: async () => "<div>ok</div>" });

    await fetchRenderedWidget("footer", { type: "x" }, {});

    const body = JSON.parse(editorFetch.mock.calls[0][1].body);
    expect(body.currentCanonicalPath).toBe("");
  });

  it("forwards the page being previewed", async () => {
    editorFetch.mockResolvedValue({ ok: true, text: async () => "<div>ok</div>" });

    await fetchRenderedWidget("footer", { type: "x" }, {}, "about.html", { slug: "about", name: "About" });

    const body = JSON.parse(editorFetch.mock.calls[0][1].body);
    expect(body.page).toEqual({ slug: "about", name: "About" });
  });
});

describe("updatePreview — theme settings in any group", () => {
  const sent = async (global) => {
    vi.useFakeTimers();
    const postMessage = vi.fn();
    await updatePreview({ contentWindow: { postMessage } }, { themeSettings: { settings: { global } } }, {});
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
    return Object.fromEntries(postMessage.mock.calls.map(([message]) => [message.type, message.payload]));
  };

  it("loads fonts from any group, from the CDN the theme chose", async () => {
    const messages = await sent({
      brand: [{ id: "heading_font", type: "font_picker", default: { stack: '"Playfair Display", serif', weight: 700 } }],
      privacy: [{ id: "use_bunny_fonts", type: "checkbox", default: true }],
    });
    expect(messages.LOAD_FONTS).toEqual({
      url: "https://fonts.bunny.net/css?family=Playfair%20Display:700&display=swap",
    });
  });

  it("previews the custom CSS the published page prints when an id is repeated", async () => {
    const preferred = await sent({
      advanced: [{ id: "custom_css", type: "code", language: "css", value: "PREFERRED" }],
      other: [{ id: "custom_css", type: "code", language: "css", value: "OTHER" }],
    });
    expect(preferred.UPDATE_CUSTOM_CSS).toEqual({ custom_css: "PREFERRED" });

    const ambiguous = await sent({
      one: [{ id: "custom_css", type: "code", language: "css", value: "ONE" }],
      two: [{ id: "custom_css", type: "code", language: "css", value: "TWO" }],
    });
    expect(ambiguous.UPDATE_CUSTOM_CSS).toEqual({ custom_css: "" });
  });

  it("sends the reserved code settings where their tags print them, whatever language they declare", async () => {
    const messages = await sent({
      code: [
        { id: "custom_css", type: "code", value: "p{}" },
        { id: "custom_head_scripts", type: "code", language: "css", value: "<script>h</script>" },
      ],
    });
    expect(messages.UPDATE_CUSTOM_CSS).toEqual({ custom_css: "p{}" });
    expect(messages.UPDATE_CUSTOM_SCRIPTS).toEqual({
      custom_head_scripts: { html: "<script>h</script>", placement: "head" },
    });
  });

  it("still previews a theme's own code setting whose id is an object property name", async () => {
    const messages = await sent({ code: [{ id: "constructor", type: "code", language: "css", value: "a{}" }] });
    expect(messages.UPDATE_CUSTOM_CSS).toEqual({ constructor: "a{}" });
  });

  it("reads style classes from any group", async () => {
    const messages = await sent({ look: [{ id: "corner_style", type: "select", value: "rounded" }] });
    expect(messages.UPDATE_STYLE_CLASSES).toEqual({ corner: "rounded" });
  });
});
