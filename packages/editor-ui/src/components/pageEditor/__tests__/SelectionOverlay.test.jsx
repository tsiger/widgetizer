// @vitest-environment jsdom
// SelectionOverlay acts on what the preview iframe posts — a selection, and a
// reorder that changes the page. Only the iframe's own window counts, and only a
// well-formed message.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

const reorderWidgets = vi.fn();
vi.mock("../../../stores/widgetStore", () => {
  const state = { hoveredWidgetId: null, hoveredBlockId: null, reorderWidgets: (...args) => reorderWidgets(...args) };
  return { default: (selector) => selector(state) };
});
vi.mock("../../../stores/pageStore", () => {
  const state = { page: { widgetsOrder: ["w1", "w2", "w3"] } };
  return { default: (selector) => selector(state) };
});
vi.mock("../../../queries/previewManager", () => ({ scrollElementIntoView: vi.fn() }));

import SelectionOverlay from "../SelectionOverlay";

let iframe;
let stranger;
let onWidgetSelect;

beforeEach(() => {
  iframe = document.createElement("iframe");
  stranger = document.createElement("iframe");
  document.body.append(iframe, stranger);
  reorderWidgets.mockClear();
  onWidgetSelect = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
  render(
    <SelectionOverlay
      iframeRef={{ current: iframe }}
      onWidgetSelect={onWidgetSelect}
      previewReadyKey={0}
      structuralReloadRef={{ current: false }}
    />,
  );
});

afterEach(() => {
  iframe.remove();
  stranger.remove();
});

function post(data, { origin = window.location.origin, source = iframe.contentWindow } = {}) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin, source }));
  });
}

describe("SelectionOverlay inbound messages", () => {
  it("applies a reorder and a selection from the preview iframe", () => {
    post({ type: "REORDER_WIDGET", payload: { widgetId: "w2", direction: "up" } });
    expect(reorderWidgets).toHaveBeenCalledWith(["w2", "w1", "w3"]);
    post({ type: "WIDGET_SELECTED", payload: { widgetId: "w3", blockId: null } });
    expect(onWidgetSelect).toHaveBeenCalledWith("w3");
  });

  it("ignores another window, another origin and a malformed payload", () => {
    post({ type: "REORDER_WIDGET", payload: { widgetId: "w2", direction: "up" } }, { source: stranger.contentWindow });
    post({ type: "REORDER_WIDGET", payload: { widgetId: "w2", direction: "up" } }, { origin: "https://evil.example" });
    post({ type: "REORDER_WIDGET", payload: { widgetId: "w2", direction: "sideways" } });
    post({ type: "WIDGET_SELECTED", payload: { widgetId: { toString: () => "w3" } } });
    post(null);
    expect(reorderWidgets).not.toHaveBeenCalled();
    expect(onWidgetSelect).not.toHaveBeenCalled();
  });
});
