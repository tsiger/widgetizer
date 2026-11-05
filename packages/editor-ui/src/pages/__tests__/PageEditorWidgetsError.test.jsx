// @vitest-environment jsdom
/**
 * Without its widgets' schemas the page editor can't show settings or insert
 * widgets, so a failed widget load must show as a failure, with a way to try
 * again, not as an editor that looks empty.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../hooks/useThemeLocale", () => ({ useThemeLocale: () => ({ tTheme: (key) => key }) }));
vi.mock("../../hooks/useNavigationGuard", () => ({ default: () => {} }));
vi.mock("../../hooks/useDeleteKeyShortcut", () => ({ default: () => {} }));
vi.mock("../../lib/activeProjectId", () => ({ getActiveProjectId: () => "p1", registerProjectStore: () => {} }));
vi.mock("../../components/pageEditor/WidgetList", () => ({ default: () => <div data-testid="widget-list" /> }));
vi.mock("../../components/pageEditor/PreviewPanel", () => ({ default: () => <div data-testid="preview" /> }));
vi.mock("../../components/pageEditor/SettingsPanel", () => ({ default: () => <div /> }));
vi.mock("../../components/pageEditor/EditorTopBar", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../components/pageEditor/ThemeSelector", () => ({ default: () => null }));

const page = { id: "about", name: "About", language: "en", widgets: {}, widgetsOrder: [] };
vi.mock("../../stores/pageStore", () => {
  const state = { page, loading: false, error: null, sharedAreas: {}, declaredAreas: [], idRepairs: null, loadPage: () => {} };
  const store = (selector) => (selector ? selector(state) : state);
  store.getState = () => state;
  return { default: store };
});
vi.mock("../../stores/projectStore", () => {
  const state = { activeProject: { id: "p1" } };
  const store = (selector) => (selector ? selector(state) : state);
  store.getState = () => state;
  return { default: store, useIsMultilang: () => false, useDefaultLanguage: () => "en" };
});

const getProjectWidgets = vi.fn();
vi.mock("../../queries/previewManager", () => ({ getProjectWidgets: (...args) => getProjectWidgets(...args) }));

const { default: PageEditor } = await import("../PageEditor.jsx");
const { default: useWidgetStore } = await import("../../stores/widgetStore.js");

beforeEach(() => {
  getProjectWidgets.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const renderEditor = () =>
  render(
    <MemoryRouter initialEntries={["/page-editor?pageId=about"]}>
      <Routes>
        <Route path="/page-editor" element={<PageEditor />} />
        <Route path="/pages" element={<div data-testid="pages-list" />} />
      </Routes>
    </MemoryRouter>,
  );

describe("PageEditor — widgets that fail to load", () => {
  it("shows the failure instead of the editor, and Try again reloads the widgets", async () => {
    getProjectWidgets.mockRejectedValueOnce(new Error("Failed to get widgets"));
    renderEditor();

    expect(await screen.findByRole("alert")).toHaveTextContent("pageEditor.widgetsLoadError");
    expect(screen.queryByTestId("widget-list")).toBeNull();

    getProjectWidgets.mockResolvedValueOnce([{ type: "text", settings: [] }]);
    fireEvent.click(screen.getByRole("button", { name: "pageEditor.widgetsLoadRetry" }));

    expect(await screen.findByTestId("widget-list")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    await waitFor(() => expect(useWidgetStore.getState().schemas.text).toBeDefined());
  });

  it("offers a way back to the pages list", async () => {
    getProjectWidgets.mockRejectedValueOnce(new Error("Failed to get widgets"));
    renderEditor();
    fireEvent.click(await screen.findByRole("button", { name: "pageEditor.toolbar.backToPages" }));
    expect(await screen.findByTestId("pages-list")).toBeInTheDocument();
  });

  it("shows the editor when the widgets load", async () => {
    getProjectWidgets.mockResolvedValueOnce([{ type: "text", settings: [] }]);
    renderEditor();
    expect(await screen.findByTestId("widget-list")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
