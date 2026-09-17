// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PluginProvider } from "../../../extension/PluginProvider.jsx";
import EditorTopBar from "../EditorTopBar.jsx";
import useAutoSave from "../../../stores/saveStore.js";
import usePageStore from "../../../stores/pageStore.js";

const getAllPages = vi.fn().mockResolvedValue([]);
const navigate = vi.fn();
vi.mock("../../../queries/pageManager", () => ({ getAllPages: (...args) => getAllPages(...args) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

function renderTopBar() {
  return render(
    <MemoryRouter>
      <PluginProvider>
        <EditorTopBar pageName="Home" pageId="home" />
      </PluginProvider>
    </MemoryRouter>,
  );
}

describe("EditorTopBar undo/redo dirty-tracking", () => {
  it("reconciles modifiedWidgets after Ctrl+Z (undo) so a revert-to-clean isn't left falsely dirty", () => {
    const reconcileModifiedWidgets = vi.fn();
    useAutoSave.setState({ reconcileModifiedWidgets });
    usePageStore.temporal.setState({ pastStates: [{ page: { id: "home", widgets: {} } }], futureStates: [] });
    renderTopBar();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(reconcileModifiedWidgets).toHaveBeenCalled();
  });

  it("reconciles modifiedWidgets after Ctrl+Shift+Z (redo)", () => {
    const reconcileModifiedWidgets = vi.fn();
    useAutoSave.setState({ reconcileModifiedWidgets });
    usePageStore.temporal.setState({ pastStates: [], futureStates: [{ page: { id: "home", widgets: {} } }] });
    renderTopBar();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(reconcileModifiedWidgets).toHaveBeenCalled();
  });
});

describe("EditorTopBar manual-save failure handling", () => {
  // The new saveStore's save(false) REJECTS on genuine failure (the old store
  // swallowed with console.error); both manual callsites below are fire-and-forget,
  // so an unhandled rejection would otherwise surface as an unhandled promise
  // rejection instead of a logged error.
  it("logs and does not throw when the Save button's manual save rejects", async () => {
    const error = new Error("boom");
    const save = vi.fn().mockRejectedValue(error);
    useAutoSave.setState({ save, hasUnsavedChanges: () => true, isSaving: false });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderTopBar();
    fireEvent.click(screen.getByTitle("pageEditor.toolbar.save (Ctrl+S)"));
    await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save:", error));
    consoleErrorSpy.mockRestore();
  });

  it("logs and does not throw when Ctrl+S's manual save rejects", async () => {
    const error = new Error("boom");
    const save = vi.fn().mockRejectedValue(error);
    useAutoSave.setState({ save, hasUnsavedChanges: () => true, isSaving: false });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderTopBar();
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save:", error));
    consoleErrorSpy.mockRestore();
  });
});

// A slug is unique per language, so the switcher would otherwise list the same
// name twice and open whichever the default language holds.
describe("EditorTopBar page switcher across languages", () => {
  const PAGES = [
    { id: "about", slug: "about", name: "About", language: "en" },
    { id: "careers", slug: "careers", name: "Careers", language: "en" },
    { id: "sxetika", slug: "sxetika", name: "Sxetika", language: "el" },
    { id: "kariera", slug: "kariera", name: "Kariera", language: "el" },
  ];

  // The switcher only appears once its list holds more than one page, and the
  // list arrives after mount.
  const openSwitcher = async () => fireEvent.click(await screen.findByRole("button", { name: /Sxetika/ }));

  const renderFor = (pageLanguage) =>
    render(
      <MemoryRouter>
        <PluginProvider>
          <EditorTopBar pageName="Sxetika" pageId="sxetika" pageLanguage={pageLanguage} />
        </PluginProvider>
      </MemoryRouter>,
    );

  it("lists only the pages of the language being edited, and opens them in it", async () => {
    getAllPages.mockResolvedValue(PAGES);
    navigate.mockReset();
    renderFor("el");
    await openSwitcher();

    expect(screen.getByText("Kariera")).toBeTruthy();
    expect(screen.queryByText("About")).toBeNull();
    expect(screen.queryByText("Careers")).toBeNull();

    fireEvent.click(screen.getByText("Kariera"));
    expect(navigate).toHaveBeenCalledWith("/page-editor?pageId=kariera&language=el");
  });

  it("keeps every page, and adds no language, when the site has one", async () => {
    getAllPages.mockResolvedValue(PAGES.filter((page) => page.language === "en"));
    navigate.mockReset();
    renderFor(undefined);
    await openSwitcher();

    expect(screen.getByText("About")).toBeTruthy();
    fireEvent.click(screen.getByText("Careers"));
    expect(navigate).toHaveBeenCalledWith("/page-editor?pageId=careers");
  });
});
