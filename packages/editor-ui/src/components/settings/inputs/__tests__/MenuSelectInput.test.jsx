// @vitest-environment jsdom
/**
 * The menu setting on a header or footer. Menus are a per-language set, not a
 * translation group, so this picker stays inside the language being edited —
 * pointing a Greek header at the English menu renders English labels.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";

const getAllMenus = vi.fn();
vi.mock("../../../../queries/menuManager", () => ({ getAllMenus: (...args) => getAllMenus(...args) }));

const { default: MenuSelectInput } = await import("../MenuSelectInput.jsx");
const { default: useProjectStore } = await import("../../../../stores/projectStore");
const { EditingLanguageProvider } = await import("../../../../lib/editingLanguage.jsx");

const EN_MAIN = { id: "main", uuid: "u-en-main", name: "Main", language: "en" };
const EL_MAIN = { id: "main", uuid: "u-el-main", name: "Kyrio", language: "el" };

const setSiteLanguages = (languages) =>
  useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages } });

const renderFor = (editing, value = "") =>
  render(
    <EditingLanguageProvider language={editing}>
      <MenuSelectInput id="menu" value={value} onChange={vi.fn()} />
    </EditingLanguageProvider>,
  );

const optionLabels = () => [...screen.getByRole("combobox").options].map((o) => o.textContent);

beforeEach(() => {
  getAllMenus.mockReset().mockResolvedValue([EN_MAIN, EL_MAIN]);
  setSiteLanguages(["el"]);
});
afterEach(cleanup);

describe("MenuSelectInput across languages", () => {
  it("offers only the menus of the language being edited", async () => {
    renderFor("el");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeTruthy());
    expect(optionLabels()).toEqual(["Select a menu...", "Kyrio"]);
  });

  // A bare slug means THIS language's menu of that name, falling back to the
  // root one when the language has none. The picker has to follow the renderer
  // exactly, or it shows one menu while the page renders another.
  it("resolves a legacy slug to this language's own menu", async () => {
    renderFor("el", "main");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeTruthy());
    expect(screen.getByRole("combobox").value).toBe("u-el-main");
    expect(optionLabels()).toEqual(["Select a menu...", "Kyrio"]);
  });

  it("falls a legacy slug back to the root menu when this language has none of that name", async () => {
    getAllMenus.mockResolvedValue([EN_MAIN, { ...EL_MAIN, id: "kyrio", uuid: "u-el-other" }]);
    renderFor("el", "main");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeTruthy());
    expect(screen.getByRole("combobox").value).toBe("u-en-main");
    expect(optionLabels()).toEqual(["Select a menu...", "Kyrio", "Main (en)"]);
  });

  it("keeps showing a value that already points at another language", async () => {
    renderFor("el", "u-en-main");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeTruthy());
    expect(screen.getByRole("combobox").value).toBe("u-en-main");
    expect(optionLabels()).toEqual(["Select a menu...", "Kyrio", "Main (en)"]);
  });

  it("is the plain list it always was while the site has one language", async () => {
    setSiteLanguages([]);
    getAllMenus.mockResolvedValue([EN_MAIN]);
    renderFor("en", "main");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeTruthy());
    expect(optionLabels()).toEqual(["Select a menu...", "Main"]);
    expect(screen.getByRole("combobox").value).toBe("u-en-main");
  });

  it("reports the uuid of what was picked", async () => {
    const onChange = vi.fn();
    render(
      <EditingLanguageProvider language="el">
        <MenuSelectInput id="menu" value="" onChange={onChange} />
      </EditingLanguageProvider>,
    );
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeTruthy());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "u-el-main" } });
    expect(onChange).toHaveBeenCalledWith("u-el-main");
  });
});
