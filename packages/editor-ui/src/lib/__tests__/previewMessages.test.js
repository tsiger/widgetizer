// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isPreviewMessage, readPreviewMessage } from "../previewMessages";
import { getPreviewTargetOrigin, setPreviewRenderBase } from "../previewBase";

// The inbound guard of the editor <-> preview bridge. The preview origin comes
// from the render base (module state, reset after each test); the source check
// compares against a real jsdom iframe's window.

let iframe;
let other;

beforeEach(() => {
  iframe = document.createElement("iframe");
  other = document.createElement("iframe");
  document.body.append(iframe, other);
});

afterEach(() => {
  iframe.remove();
  other.remove();
  setPreviewRenderBase("");
});

const message = (data, { origin = window.location.origin, source } = {}) =>
  new MessageEvent("message", { data, origin, source: source === undefined ? iframe.contentWindow : source });

describe("isPreviewMessage", () => {
  it("accepts the preview's origin and the iframe's own window", () => {
    expect(isPreviewMessage(message({ type: "X" }), iframe)).toBe(true);
  });

  it("checks only the origin when no iframe is passed", () => {
    expect(isPreviewMessage(message({ type: "X" }, { source: null }))).toBe(true);
  });

  it("rejects another origin", () => {
    expect(isPreviewMessage(message({ type: "X" }, { origin: "https://evil.example" }), iframe)).toBe(false);
    expect(isPreviewMessage(message({ type: "X" }, { origin: "https://evil.example" }))).toBe(false);
  });

  it("rejects another window", () => {
    expect(isPreviewMessage(message({ type: "X" }, { source: other.contentWindow }), iframe)).toBe(false);
  });

  it("rejects everything when the iframe passed is missing", () => {
    expect(isPreviewMessage(message({ type: "X" }), null)).toBe(false);
  });

  it("follows an absolute render base's origin", () => {
    setPreviewRenderBase("http://127.0.0.1:3001/p/x");
    expect(isPreviewMessage(message({ type: "X" }, { origin: "http://127.0.0.1:3001" }), iframe)).toBe(true);
    expect(isPreviewMessage(message({ type: "X" }), iframe)).toBe(false);
  });

  it("rejects everything when the render base gives no known origin", () => {
    setPreviewRenderBase("http://[bad");
    expect(getPreviewTargetOrigin()).toBe("*");
    expect(isPreviewMessage(message({ type: "X" }, { origin: "*" }), iframe)).toBe(false);
    expect(isPreviewMessage(message({ type: "X" }), iframe)).toBe(false);
  });
});

describe("readPreviewMessage", () => {
  const read = (data, options) => readPreviewMessage(message(data, options), iframe);

  it("returns null for a message from elsewhere, whatever it carries", () => {
    expect(read({ type: "WIDGET_SELECTED", payload: { widgetId: "w1" } }, { origin: "https://evil.example" })).toBeNull();
  });

  it("returns null for data that is not a typed object, and for types the editor does not handle", () => {
    expect(read(null)).toBeNull();
    expect(read("PREVIEW_READY")).toBeNull();
    expect(read({ payload: {} })).toBeNull();
    expect(read({ type: "ELEMENT_BOUNDS", payload: {} })).toBeNull();
    expect(read({ type: "toString", payload: {} })).toBeNull();
  });

  describe("PREVIEW_READY", () => {
    const themeReadsOf = (themeReads) => read({ type: "PREVIEW_READY", payload: { themeReads } })?.payload.themeReads;

    it("passes well-formed theme reads", () => {
      const themeReads = { widgets: { w1: ["colors.accent"], header: [] }, layout: ["general.*"] };
      expect(read({ type: "PREVIEW_READY", payload: { themeReads } })).toEqual({
        type: "PREVIEW_READY",
        payload: { themeReads },
      });
    });

    it("passes null theme reads and a missing payload", () => {
      expect(themeReadsOf(null)).toBeNull();
      expect(read({ type: "PREVIEW_READY" })).toEqual({ type: "PREVIEW_READY", payload: { themeReads: null } });
    });

    it("passes a very large page's reads: no count cap", () => {
      const widgets = {};
      for (let i = 0; i < 6000; i++) {
        widgets[`widget_${i}-0000-0000-0000-000000000000`] = Array.from({ length: 12 }, (_, j) => `colors.setting_${j}`);
      }
      expect(themeReadsOf({ widgets, layout: [] })).toEqual({ widgets, layout: [] });
    });

    it("drops the whole value for any other shape, without throwing", () => {
      const cyclic = { widgets: {} };
      cyclic.widgets.w1 = cyclic;
      class Reads {
        constructor() {
          this.widgets = {};
        }
      }
      expect(themeReadsOf({ widgets: { w1: "colors.accent" } })).toBeNull();
      expect(themeReadsOf({ widgets: { w1: ["colors.accent", 7] } })).toBeNull();
      expect(themeReadsOf({ widgets: { w1: [["colors.accent"]] } })).toBeNull();
      expect(themeReadsOf({ widgets: { w1: { a: ["colors.accent"] } } })).toBeNull();
      expect(themeReadsOf({ widgets: [] })).toBeNull();
      expect(themeReadsOf({ layout: "general.*" })).toBeNull();
      expect(themeReadsOf({ layout: ["x".repeat(257)] })).toBeNull();
      expect(themeReadsOf(cyclic)).toBeNull();
      expect(themeReadsOf(new Reads())).toBeNull();
    });

    it("drops a payload that is not an object", () => {
      expect(read({ type: "PREVIEW_READY", payload: "ready" })).toBeNull();
    });
  });

  describe("WIDGET_SELECTED", () => {
    it("passes a widget id with or without a block id", () => {
      expect(read({ type: "WIDGET_SELECTED", payload: { widgetId: "w1", blockId: "b1" } })?.payload).toEqual({
        widgetId: "w1",
        blockId: "b1",
      });
      expect(read({ type: "WIDGET_SELECTED", payload: { widgetId: "w1", blockId: null } })?.payload).toEqual({
        widgetId: "w1",
        blockId: null,
      });
    });

    it("drops a malformed one", () => {
      expect(read({ type: "WIDGET_SELECTED", payload: { widgetId: 1 } })).toBeNull();
      expect(read({ type: "WIDGET_SELECTED", payload: { widgetId: "w".repeat(129) } })).toBeNull();
      expect(read({ type: "WIDGET_SELECTED", payload: { widgetId: "w1", blockId: {} } })).toBeNull();
      expect(read({ type: "WIDGET_SELECTED" })).toBeNull();
    });
  });

  describe("REORDER_WIDGET", () => {
    it("passes a widget id and a direction", () => {
      expect(read({ type: "REORDER_WIDGET", payload: { widgetId: "w1", direction: "down" } })?.payload).toEqual({
        widgetId: "w1",
        direction: "down",
      });
    });

    it("drops any other direction", () => {
      expect(read({ type: "REORDER_WIDGET", payload: { widgetId: "w1", direction: "top" } })).toBeNull();
      expect(read({ type: "REORDER_WIDGET", payload: { direction: "up" } })).toBeNull();
    });
  });

  describe("NAVIGATE_PREVIEW", () => {
    it("passes a url", () => {
      expect(read({ type: "NAVIGATE_PREVIEW", payload: { url: "/preview/about" } })?.payload).toEqual({
        url: "/preview/about",
      });
    });

    it("drops a url that is not a string or is too long", () => {
      expect(read({ type: "NAVIGATE_PREVIEW", payload: { url: ["/preview/about"] } })).toBeNull();
      expect(read({ type: "NAVIGATE_PREVIEW", payload: { url: `/preview/${"a".repeat(2048)}` } })).toBeNull();
    });
  });

  describe("SCROLL_POSITION", () => {
    it("passes a finite, non-negative position", () => {
      expect(read({ type: "SCROLL_POSITION", payload: { scrollY: 420.5 } })?.payload).toEqual({ scrollY: 420.5 });
      expect(read({ type: "SCROLL_POSITION", payload: { scrollY: 0 } })?.payload).toEqual({ scrollY: 0 });
    });

    it("drops anything else", () => {
      expect(read({ type: "SCROLL_POSITION", payload: { scrollY: -1 } })).toBeNull();
      expect(read({ type: "SCROLL_POSITION", payload: { scrollY: Infinity } })).toBeNull();
      expect(read({ type: "SCROLL_POSITION", payload: { scrollY: "100" } })).toBeNull();
      expect(read({ type: "SCROLL_POSITION", payload: { scrollY: NaN } })).toBeNull();
    });
  });
});
