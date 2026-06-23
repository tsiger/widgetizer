// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Regression guard for the standalone page-preview boot race (Electron + web):
// the preview window/tab cold-boots and `fetchActiveProject()` resolves a beat
// AFTER the first render. PagePreview must NOT load the page or mount the live
// PreviewPanel until the active project is seeded — otherwise the activeProject
// `undefined → id` flip resets PreviewPanel mid-load and aborts the in-flight
// /render/<token> iframe (did-fail-load -3). This mirrors the gate hosted's
// StandalonePreview.jsx already has.

const loadPage = vi.fn();

// Mutable store states the fake hooks read at call time, so each test seeds the
// project/page the component sees. The fakes honour both call shapes PagePreview
// uses: bare `useStore()` and selector `useStore((s) => s.x)`.
let projectState;
let pageState;
let themeState;

vi.mock("@widgetizer/editor-ui/stores/projectStore", () => ({
  default: (selector) => (selector ? selector(projectState) : projectState),
}));
vi.mock("@widgetizer/editor-ui/stores/pageStore", () => ({
  default: (selector) => (selector ? selector(pageState) : pageState),
}));
vi.mock("@widgetizer/editor-ui/stores/themeStore", () => ({
  default: (selector) => (selector ? selector(themeState) : themeState),
}));

// PreviewPanel is the heavy iframe component whose mount is the race-prone path —
// replace it with a sentinel so the test can assert whether the page preview
// mounts it (bug) vs. holds at the loading gate (fixed).
vi.mock("@widgetizer/editor-ui/components/pageEditor/PreviewPanel.jsx", () => ({
  default: () => <div data-testid="preview-panel" />,
}));
vi.mock("@widgetizer/editor-ui/components/ui/LoadingSpinner.jsx", () => ({
  default: ({ message }) => <div data-testid="loading">{message}</div>,
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock("../../components/dev/DebugStatePanel", () => ({ default: () => null }));

import PagePreview from "../PagePreview.jsx";

function renderPreview() {
  return render(
    <MemoryRouter initialEntries={["/preview/contact"]}>
      <Routes>
        <Route path="/preview/:pageId" element={<PagePreview />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  loadPage.mockClear();
  projectState = { activeProject: null };
  pageState = { page: null, loading: true, error: null, loadPage };
  themeState = { settings: {} };
});

describe("PagePreview — active-project gate (boot-race guard)", () => {
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

  it("does not mount PreviewPanel until the active project is seeded", () => {
    // Page is fully loaded, but the project hasn't arrived yet — the unfixed
    // component would already mount PreviewPanel here and start the iframe.
    projectState = { activeProject: null };
    pageState = { page: { id: "contact", widgets: {} }, loading: false, error: null, loadPage };
    renderPreview();
    expect(screen.queryByTestId("preview-panel")).toBeNull();
  });

  it("mounts PreviewPanel once the active project is seeded and the page is loaded", () => {
    projectState = { activeProject: { id: "p1" } };
    pageState = { page: { id: "contact", widgets: {} }, loading: false, error: null, loadPage };
    renderPreview();
    expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
  });
});
