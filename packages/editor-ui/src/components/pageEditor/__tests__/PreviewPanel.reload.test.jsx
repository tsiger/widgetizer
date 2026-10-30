// @vitest-environment jsdom
// PreviewPanel when a reload's mint fails: the error panel says so — a host's
// "too many open previews" answer in its own words — and nothing mints again
// until the panel's button asks. Also: what the frame posts reaches the live
// updates only as the validated copy.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../../hooks/useThemeLocale", () => ({ useThemeLocale: () => ({ tTheme: (key) => key }) }));
vi.mock("../../../stores/pageStore", () => {
  const state = { globalWidgets: {}, sharedAreas: {}, loadedProjectId: "proj" };
  return { default: (selector) => (selector ? selector(state) : state) };
});
vi.mock("../../../stores/projectStore", () => {
  const state = { activeProject: { id: "proj" } };
  return { default: (selector) => (selector ? selector(state) : state) };
});
vi.mock("../../../stores/widgetStore", () => {
  const state = { schemas: {} };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../../queries/previewManager", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchPreviewToken: vi.fn(), updatePreview: vi.fn(), setPreviewThemeReads: vi.fn(actual.setPreviewThemeReads) };
});

import PreviewPanel from "../PreviewPanel";
import { fetchPreviewToken, setPreviewThemeReads } from "../../../queries/previewManager";

const widget = { type: "x", settings: {}, blocks: {}, blocksOrder: [] };
const pageWith = (ids, id = "p1") => ({ id, slug: id, widgetsOrder: ids });
const widgetsFor = (ids) => Object.fromEntries(ids.map((id) => [id, widget]));

function Panel({ ids, pageId }) {
  return <PreviewPanel page={pageWith(ids, pageId)} widgets={widgetsFor(ids)} themeSettings={{}} showSelectionOverlay={false} />;
}

const capacity = () =>
  Object.assign(new Error("Too many open previews"), { name: "ApiError", status: 429, code: "preview_capacity" });

let errorSpy;
beforeEach(() => {
  fetchPreviewToken.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

async function loaded() {
  fetchPreviewToken.mockResolvedValueOnce({ token: "t1" });
  const view = render(<Panel ids={["w1"]} />);
  await waitFor(() => expect(view.container.querySelector("iframe")?.getAttribute("src")).toContain("/render/t1"));
  return view;
}

describe("PreviewPanel reload failures", () => {
  it("shows a host's capacity refusal and mints nothing further", async () => {
    const view = await loaded();
    fetchPreviewToken.mockRejectedValue(capacity());

    view.rerender(<Panel ids={["w1", "w2"]} />);
    await screen.findByText("pageEditor.preview.tooManyPreviews", {}, { timeout: 2000 });
    expect(fetchPreviewToken).toHaveBeenCalledTimes(2);

    // Further edits do not mint again on their own.
    view.rerender(<Panel ids={["w1", "w2", "w3"]} />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
    expect(fetchPreviewToken).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("shows any other failure's own message", async () => {
    const view = await loaded();
    fetchPreviewToken.mockRejectedValue(new Error("Failed to create preview token"));
    view.rerender(<Panel ids={["w1", "w2"]} />);
    await screen.findByText("Failed to create preview token", {}, { timeout: 2000 });
    expect(fetchPreviewToken).toHaveBeenCalledTimes(2);
  });
});

describe("PreviewPanel inbound PREVIEW_READY", () => {
  it("hands the live updates a copy, whatever the sender's object does later", async () => {
    const view = await loaded();
    const iframe = view.container.querySelector("iframe");
    let reads = 0;
    const themeReads = {
      get widgets() {
        if (reads++) throw new Error("second read");
        return { w1: ["colors.accent"] };
      },
    };
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "PREVIEW_READY", payload: { themeReads } },
          origin: window.location.origin,
          source: iframe.contentWindow,
        }),
      );
    });
    expect(setPreviewThemeReads).toHaveBeenCalledWith(iframe, { widgets: { w1: ["colors.accent"] } });
    // (Compared by identity only: a matcher would read the hostile getter again.)
    expect(setPreviewThemeReads.mock.calls.at(-1)[1] === themeReads).toBe(false);
  });
});

describe("PreviewPanel page switch during the first load", () => {
  it("shows only the page opened last, whichever mint answers when", async () => {
    let answerFirst;
    fetchPreviewToken.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
    fetchPreviewToken.mockResolvedValueOnce({ token: "t2" });
    const view = render(<Panel ids={["w1"]} pageId="p1" />);
    await waitFor(() => expect(fetchPreviewToken).toHaveBeenCalledTimes(1));
    view.rerender(<Panel ids={["w1"]} pageId="p2" />);
    // The second page's mint waits for the first to answer.
    expect(fetchPreviewToken).toHaveBeenCalledTimes(1);
    await act(async () => answerFirst({ token: "t1" }));
    await waitFor(() => expect(view.container.querySelector("iframe")?.getAttribute("src")).toContain("/render/t2"));
    expect(fetchPreviewToken).toHaveBeenCalledTimes(2);
    expect(fetchPreviewToken.mock.calls[1][0].id).toBe("p2");
  });
});
