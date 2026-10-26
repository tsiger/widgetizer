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

import { fetchRenderedWidget, setPreviewThemeReads, updatePreview } from "../previewManager";
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

describe("updatePreview — re-renders only what a site setting change can affect", () => {
  const settings = (accent, extra = {}) => ({
    settings: {
      global: {
        colors: [{ id: "accent", type: "color", outputAsCssVar: true, value: accent }],
        general: [
          { id: "show_breadcrumbs", type: "checkbox", value: extra.breadcrumbs ?? false },
          { id: "date_format", type: "select", value: extra.dateFormat ?? "D MMM YYYY" },
        ],
      },
    },
  });
  const widgets = { a: { type: "x", settings: {} }, b: { type: "y", settings: {} } };
  const frame = () => ({ contentWindow: { postMessage: vi.fn() } });
  const renderedIds = () => editorFetch.mock.calls.map(([, options]) => JSON.parse(options.body).widgetId).sort();
  const respond = () =>
    editorFetch.mockImplementation(async (_path, options) => ({
      ok: true,
      json: async () => ({ html: `<div>${JSON.parse(options.body).widgetId}</div>`, themeReads: ["general.date_format"] }),
    }));

  it("applies a colour at once and re-renders no widget that does not read it", async () => {
    respond();
    const iframe = frame();
    setPreviewThemeReads(iframe, { widgets: { a: ["general.date_format"], b: [] }, layout: ["general.show_breadcrumbs"] });
    const result = await updatePreview(iframe, { widgets, themeSettings: settings("#00f") }, { widgets, themeSettings: settings("#f00") });
    expect(result).toEqual({});
    expect(editorFetch).not.toHaveBeenCalled();
    expect(iframe.contentWindow.postMessage.mock.calls.map(([m]) => m.type)).toContain("UPDATE_CSS_VARIABLES");
  });

  it("re-renders the widgets that read the changed setting, and those with unknown reads", async () => {
    respond();
    const iframe = frame();
    setPreviewThemeReads(iframe, { widgets: { a: ["general.date_format"] }, layout: [] });
    await updatePreview(
      iframe,
      { widgets, themeSettings: settings("#f00", { dateFormat: "YYYY-MM-DD" }) },
      { widgets, themeSettings: settings("#f00") },
    );
    expect(renderedIds()).toEqual(["a", "b"]);
    const morphed = iframe.contentWindow.postMessage.mock.calls.filter(([m]) => m.type === "MORPH_WIDGET");
    expect(morphed.map(([m]) => m.payload.widgetId)).toEqual(["a", "b"]);
  });

  it("asks for a full reload when the layout reads a changed setting the runtime cannot apply", async () => {
    respond();
    const iframe = frame();
    setPreviewThemeReads(iframe, { widgets: { a: [], b: [] }, layout: ["general.show_breadcrumbs"] });
    const result = await updatePreview(
      iframe,
      { widgets, themeSettings: settings("#f00", { breadcrumbs: true }) },
      { widgets, themeSettings: settings("#f00") },
    );
    expect(result).toEqual({ needsReload: true });
    expect(editorFetch).not.toHaveBeenCalled();
  });

  it("reloads when the layout printed a setting, even one the runtime applies as a variable", async () => {
    respond();
    const iframe = frame();
    setPreviewThemeReads(iframe, { widgets: { a: [], b: [] }, layout: ["colors.accent"] });
    const result = await updatePreview(iframe, { widgets, themeSettings: settings("#00f") }, { widgets, themeSettings: settings("#f00") });
    expect(result).toEqual({ needsReload: true });
  });

  it("re-renders a widget whose setting changed only by its default, or was removed", async () => {
    respond();
    const iframe = frame();
    setPreviewThemeReads(iframe, { widgets: { a: ["general.show_breadcrumbs"], b: ["general.gone"] }, layout: [] });
    const before = settings("#f00");
    before.settings.global.general.push({ id: "gone", type: "text", value: "x" });
    const after = settings("#f00");
    delete after.settings.global.general[0].value;
    after.settings.global.general[0].default = true;
    await updatePreview(iframe, { widgets, themeSettings: after }, { widgets, themeSettings: before });
    expect(renderedIds()).toEqual(["a", "b"]);
  });

  it("sends unchanged custom code only once", async () => {
    vi.useFakeTimers();
    const iframe = frame();
    setPreviewThemeReads(iframe, { widgets: {}, layout: [] });
    const withCode = (accent) => {
      const theme = settings(accent);
      theme.settings.global.advanced = [{ id: "custom_footer_scripts", type: "code", value: "<script>x</script>" }];
      return theme;
    };
    await updatePreview(iframe, { widgets: {}, themeSettings: withCode("#00f") }, { widgets: {}, themeSettings: withCode("#f00") });
    vi.advanceTimersByTime(400);
    await updatePreview(iframe, { widgets: {}, themeSettings: withCode("#0f0") }, { widgets: {}, themeSettings: withCode("#00f") });
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
    const scripts = iframe.contentWindow.postMessage.mock.calls.filter(([m]) => m.type === "UPDATE_CUSTOM_SCRIPTS");
    expect(scripts).toHaveLength(1);
  });

  it("applies nothing from an update a newer one overtook", async () => {
    let release;
    editorFetch.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve({ ok: true, json: async () => ({ html: "old", themeReads: [] }) }))),
    );
    const iframe = frame();
    setPreviewThemeReads(iframe, { widgets: {}, layout: [] });
    const first = updatePreview(
      iframe,
      { widgets: { a: widgets.a }, themeSettings: settings("#f00", { dateFormat: "YYYY" }) },
      { widgets: { a: widgets.a }, themeSettings: settings("#f00") },
    );
    await updatePreview(iframe, { widgets: { a: widgets.a }, themeSettings: settings("#f00") }, { widgets: { a: widgets.a }, themeSettings: settings("#f00") });
    release();
    expect(await first).toEqual({ stale: true });
    expect(iframe.contentWindow.postMessage.mock.calls.some(([m]) => m.type === "MORPH_WIDGET" && m.payload.html === "old")).toBe(false);
  });
});
