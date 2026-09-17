// @vitest-environment jsdom
/**
 * The menus list once a site has more than one language. Menus are seeded per
 * language with fresh uuids — they are not a translation group — so this is tabs
 * and language-aware actions, with no chips.
 *
 * The bug this pins: an id is unique only per language, so naming one alone
 * reaches whichever menu the DEFAULT language happens to hold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getAllMenus = vi.fn();
const deleteMenu = vi.fn();
const duplicateMenu = vi.fn();
const navigate = vi.fn();
const showToast = vi.fn();
let projectState;

vi.mock("../../stores/projectStore", async () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return {
    default: hook,
    useDefaultLanguage: () => projectState.activeProject?.defaultLanguage || "en",
    useExtraLanguages: () => projectState.activeProject?.languages || [],
    useIsMultilang: () => (projectState.activeProject?.languages?.length ?? 0) > 0,
  };
});
vi.mock("../../stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../queries/menuManager", () => ({
  getAllMenus: (...args) => getAllMenus(...args),
  deleteMenu: (...args) => deleteMenu(...args),
  duplicateMenu: (...args) => duplicateMenu(...args),
}));
vi.mock("../../components/layout/PageLayout", () => ({
  default: ({ children, buttonProps }) => (
    <div>
      {buttonProps && (
        <button type="button" onClick={buttonProps.onClick}>
          {buttonProps.children}
        </button>
      )}
      {children}
    </div>
  ),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import Menus from "../Menus.jsx";

const EN_MAIN = { id: "main", uuid: "u-en-main", name: "Main", language: "en", updated: "2026-01-01" };
const EL_MAIN = { id: "main", uuid: "u-el-main", name: "Kyrio", language: "el", updated: "2026-01-01" };

const renderList = () => render(<Menus />, { wrapper: MemoryRouter });
const tab = (name) => screen.getByRole("tab", { name: new RegExp(name) });
const openRowMenu = () => fireEvent.click(screen.getByRole("button", { name: "menus.actions.menu" }));

beforeEach(() => {
  getAllMenus.mockReset().mockResolvedValue([EN_MAIN, EL_MAIN]);
  deleteMenu.mockReset().mockResolvedValue({ success: true });
  duplicateMenu.mockReset().mockResolvedValue({ ...EL_MAIN, id: "kyrio-copy", uuid: "u-copy" });
  navigate.mockReset();
  showToast.mockReset();
  projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } };
});

describe("menus list language tabs", () => {
  it("lists only the active language's menus, which otherwise share an id", async () => {
    renderList();
    await screen.findByRole("tablist");

    expect(screen.getByText("Main")).toBeTruthy();
    expect(screen.queryByText("Kyrio")).toBeNull();

    fireEvent.click(tab("Ελληνικά"));
    expect(screen.getByText("Kyrio")).toBeTruthy();
    expect(screen.queryByText("Main")).toBeNull();
  });

  it("opens a menu at its own language", async () => {
    renderList();
    await screen.findByRole("tablist");
    fireEvent.click(tab("Ελληνικά"));

    const link = screen.getByTitle("Kyrio");
    expect(link.getAttribute("href")).toBe("/menus/main/structure?language=el");
  });

  it("starts a new menu in the language being looked at", async () => {
    renderList();
    await screen.findByRole("tablist");

    fireEvent.click(tab("Ελληνικά"));
    fireEvent.click(screen.getByRole("button", { name: "menus.newMenu" }));
    expect(navigate).toHaveBeenCalledWith("/menus/add?language=el");
  });

  it("keeps the tabs when the active language has no menus of its own", async () => {
    getAllMenus.mockResolvedValue([EN_MAIN]);
    renderList();
    await screen.findByRole("tablist");

    fireEvent.click(tab("Ελληνικά"));
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.queryByText("Main")).toBeNull();
  });

  it("keeps the tabs when the project has no menus at all, and starts one in the chosen language", async () => {
    getAllMenus.mockResolvedValue([]);
    renderList();
    await screen.findByRole("tablist");

    fireEvent.click(tab("Ελληνικά"));
    fireEvent.click(screen.getByRole("button", { name: "menus.newMenu" }));
    expect(navigate).toHaveBeenCalledWith("/menus/add?language=el");
  });

  it("shows no tabs while the site has one language", async () => {
    projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: [] } };
    getAllMenus.mockResolvedValue([EN_MAIN]);
    renderList();

    await screen.findByText("Main");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByTitle("Main").getAttribute("href")).toBe("/menus/main/structure");
  });
});

describe("menus row actions stay in the row's language", () => {
  it("edits the settings of the language being looked at", async () => {
    renderList();
    await screen.findByRole("tablist");
    fireEvent.click(tab("Ελληνικά"));
    openRowMenu();

    const settings = screen.getByRole("link", { name: /menus\.actions\.editSettings/ });
    expect(settings.getAttribute("href")).toBe("/menus/edit/main?language=el");
  });

  it("deletes that language's menu, and drops only that row", async () => {
    renderList();
    await screen.findByRole("tablist");
    fireEvent.click(tab("Ελληνικά"));
    openRowMenu();

    fireEvent.click(screen.getByRole("button", { name: /menus\.actions\.delete/ }));
    fireEvent.click(await screen.findByRole("button", { name: "menus.deleteModal.confirm" }));

    await waitFor(() => expect(deleteMenu).toHaveBeenCalledWith("main", "el"));
    // The English menu shares the id and must survive.
    fireEvent.click(tab("English"));
    expect(screen.getByText("Main")).toBeTruthy();
  });

  it("duplicates within that language", async () => {
    renderList();
    await screen.findByRole("tablist");
    fireEvent.click(tab("Ελληνικά"));
    openRowMenu();

    fireEvent.click(screen.getByRole("button", { name: /menus\.actions\.duplicate/ }));
    await waitFor(() => expect(duplicateMenu).toHaveBeenCalledWith("main", "el"));
  });
});
