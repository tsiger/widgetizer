// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";

// PagePreview is a headless child of SitePreviewLayout (C4 + one-shot #17): it no
// longer mounts the live-edit PreviewPanel. It loads the saved page, requests a
// standalone render token, and reports { src, loading, notFound } up to the layout
// via the outlet context. Two behaviours are pinned:
//   1. The boot-race gate (Electron + web): a freshly opened preview window
//      cold-boots and activeProject resolves a beat AFTER first render, so the
//      page must NOT load until activeProject is seeded (regression guard for the
//      did-fail-load -3 abort).
//   2. The one-shot resolve: once the page is loaded it fetches a token and
//      reports the iframe src — no PreviewPanel, no live-edit machinery.

const loadPage = vi.fn();
const fetchPreviewToken = vi.fn();

let projectState;
let pageState;
let themeState;

// pageStore is read both as a selector hook and via getState() (for globalWidgets
// inside the async resolve), so the mock supports both call shapes.
function makeStore(getState) {
  const hook = (selector) => (selector ? selector(getState()) : getState());
  hook.getState = getState;
  return hook;
}

vi.mock("@widgetizer/editor-ui/stores/projectStore", () => ({
  default: makeStore(() => projectState),
}));
vi.mock("@widgetizer/editor-ui/stores/pageStore", () => ({
  default: makeStore(() => pageState),
}));
vi.mock("@widgetizer/editor-ui/stores/themeStore", () => ({
  default: makeStore(() => themeState),
}));
vi.mock("@widgetizer/editor-ui/queries/previewManager", () => ({
  fetchPreviewToken: (...args) => fetchPreviewToken(...args),
}));

import PagePreview from "../PagePreview.jsx";

// Capture every setPreview() the child reports so tests can assert the sequence.
let reports;
function CaptureLayout() {
  return <Outlet context={{ setPreview: (s) => reports.push(s) }} />;
}

function renderPreview() {
  return render(
    <MemoryRouter initialEntries={["/preview/contact"]}>
      <Routes>
        <Route path="/preview" element={<CaptureLayout />}>
          <Route path=":pageId" element={<PagePreview />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  loadPage.mockClear();
  fetchPreviewToken.mockReset();
  reports = [];
  projectState = { activeProject: null };
  pageState = { page: null, loading: true, error: null, loadPage, globalWidgets: {} };
  themeState = { settings: {} };
});

describe("PagePreview — boot-race gate", () => {
  it("does not load the page until the active project is seeded", () => {
    projectState = { activeProject: null };
    renderPreview();
    expect(loadPage).not.toHaveBeenCalled();
  });

  it("loads the page once the active project is seeded", () => {
    projectState = { activeProject: { id: "p1" } };
    renderPreview();
    expect(loadPage).toHaveBeenCalledWith("contact");
  });

  it("reports a loading state (no notFound) while the project is unseeded", () => {
    projectState = { activeProject: null };
    renderPreview();
    expect(reports.at(-1)).toEqual({ src: null, loading: true, notFound: false });
  });
});

describe("PagePreview — one-shot token resolve", () => {
  it("fetches a standalone token and reports the iframe src once the page is loaded", async () => {
    projectState = { activeProject: { id: "p1" } };
    pageState = { page: { id: "contact", widgets: {} }, loading: false, error: null, loadPage, globalWidgets: { header: {} } };
    fetchPreviewToken.mockResolvedValue({ token: "tok123" });

    renderPreview();

    await waitFor(() => expect(fetchPreviewToken).toHaveBeenCalled());
    // The page + its global widgets are sent with the standalone preview mode.
    expect(fetchPreviewToken).toHaveBeenCalledWith(
      { id: "contact", widgets: {}, globalWidgets: { header: {} } },
      {},
      "standalone",
    );
    await waitFor(() => {
      const last = reports.at(-1);
      expect(last.notFound).toBe(false);
      expect(last.loading).toBe(false);
      expect(last.src).toContain("/render/tok123");
    });
  });

  it("reports notFound when the page is missing", () => {
    projectState = { activeProject: { id: "p1" } };
    pageState = { page: null, loading: false, error: null, loadPage, globalWidgets: {} };
    renderPreview();
    expect(reports.at(-1)).toEqual({ src: null, loading: false, notFound: true });
  });

  it("reports notFound when the token request fails", async () => {
    projectState = { activeProject: { id: "p1" } };
    pageState = { page: { id: "contact", widgets: {} }, loading: false, error: null, loadPage, globalWidgets: {} };
    fetchPreviewToken.mockRejectedValue(new Error("boom"));

    renderPreview();

    await waitFor(() => expect(reports.at(-1)).toEqual({ src: null, loading: false, notFound: true }));
  });
});
