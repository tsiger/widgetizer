// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PluginProvider } from "../../../extension/PluginProvider.jsx";
import EditorTopBar from "../EditorTopBar.jsx";
import useAutoSave from "../../../stores/saveStore.js";
import usePageStore from "../../../stores/pageStore.js";
import useProjectStore from "../../../stores/projectStore.js";

const getAllPages = vi.fn().mockResolvedValue([]);
const createPageLanguageVersion = vi.fn();
const navigate = vi.fn();
vi.mock("../../../queries/pageManager", () => ({
  getAllPages: (...args) => getAllPages(...args),
  createPageLanguageVersion: (...args) => createPageLanguageVersion(...args),
}));

// The language controls read the real project store, so each test says what
// kind of site it is rather than leaning on whatever ran before it.
const setSiteLanguages = (languages) =>
  useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages } });
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
    setSiteLanguages(["el"]);
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
    setSiteLanguages([]);
    getAllPages.mockResolvedValue(PAGES.filter((page) => page.language === "en"));
    navigate.mockReset();
    renderFor(undefined);
    await openSwitcher();

    expect(screen.getByText("About")).toBeTruthy();
    fireEvent.click(screen.getByText("Careers"));
    expect(navigate).toHaveBeenCalledWith("/page-editor?pageId=careers");
  });
});

// The whole translation workflow from inside the editor: jump to a sibling, or
// create the one that is missing. Siblings are found by translation group, so a
// source that records none of its own is matched by its uuid.
describe("EditorTopBar language menu", () => {
  const EN_ABOUT = { id: "about", slug: "about", uuid: "u-about", name: "About", language: "en" };
  const EL_ABOUT = {
    id: "sxetika",
    slug: "sxetika",
    uuid: "u-el-about",
    translationGroupId: "u-about",
    name: "Sxetika",
    language: "el",
  };
  const EN_ALONE = { id: "careers", slug: "careers", uuid: "u-careers", name: "Careers", language: "en" };

  const renderFor = (page) => {
    usePageStore.setState({ page });
    return render(
      <MemoryRouter>
        <PluginProvider>
          <EditorTopBar pageName={page.name} pageId={page.id} pageLanguage={page.language} />
        </PluginProvider>
      </MemoryRouter>,
    );
  };

  const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "pageEditor.languages.menuLabel" }));

  beforeEach(() => {
    getAllPages.mockReset().mockResolvedValue([EN_ABOUT, EL_ABOUT, EN_ALONE]);
    createPageLanguageVersion.mockReset();
    navigate.mockReset();
    setSiteLanguages(["el"]);
  });

  it("opens the sibling that exists, by its own slug and language", async () => {
    renderFor(EN_ABOUT);
    openMenu();

    fireEvent.click((await screen.findByText("Ελληνικά")).closest("button"));
    expect(navigate).toHaveBeenCalledWith("/page-editor?pageId=sxetika&language=el");
  });

  it("creates the missing one from the page being edited, then opens it", async () => {
    createPageLanguageVersion.mockResolvedValue({ id: "kariera", slug: "kariera", language: "el" });
    renderFor(EN_ALONE);
    openMenu();

    fireEvent.click(await screen.findByRole("button", { name: "pages.languages.create" }));

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/page-editor?pageId=kariera&language=el"));
    expect(createPageLanguageVersion).toHaveBeenCalledWith("careers", {
      targetLanguage: "el",
      sourceLanguage: "en",
    });
  });

  it("stays put when the server refuses", async () => {
    createPageLanguageVersion.mockRejectedValue(new Error("nope"));
    renderFor(EN_ALONE);
    openMenu();

    fireEvent.click(await screen.findByRole("button", { name: "pages.languages.create" }));
    await vi.waitFor(() => expect(createPageLanguageVersion).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });

  // Creating a version normally navigates away; a navigation guard can cancel
  // that, and the menu would otherwise still offer to create it (a 409).
  it("counts a version it just created even when nothing navigated", async () => {
    const version = { id: "kariera", slug: "kariera", uuid: "u-new", translationGroupId: "u-careers", language: "el" };
    createPageLanguageVersion.mockResolvedValue(version);
    navigate.mockImplementation(() => {}); // a guard that refuses to leave
    renderFor(EN_ALONE);
    openMenu();

    fireEvent.click(await screen.findByRole("button", { name: "pages.languages.create" }));
    // Wait for the whole create to settle: the attempt to leave is what closes
    // the menu, so re-opening before it lands would just close it again.
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());

    openMenu();
    const greek = (await screen.findByText("Ελληνικά")).closest("button");
    expect(greek.getAttribute("aria-label")).toBe("pages.languages.open");
    expect(screen.queryByRole("button", { name: "pages.languages.create" })).toBeNull();
  });

  it("is not there at all while the site has one language", () => {
    setSiteLanguages([]);
    renderFor(EN_ABOUT);
    expect(screen.queryByRole("button", { name: "pageEditor.languages.menuLabel" })).toBeNull();
  });
});
