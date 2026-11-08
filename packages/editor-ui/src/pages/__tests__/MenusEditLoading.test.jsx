// @vitest-environment jsdom
/**
 * The menu editor shows a spinner until its menu has loaded, and again when the
 * screen moves to another menu or language, until that menu arrives. A menu that
 * can't be loaded is reported, and the screen says it wasn't found.
 */
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getMenu = vi.fn();
const showToast = vi.fn();
let params = { id: "main" };
let search = "";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => params,
  useSearchParams: () => [new URLSearchParams(search)],
  useNavigate: () => vi.fn(),
}));
vi.mock("../../queries/menuManager", () => ({ getMenu: (...args) => getMenu(...args), updateMenu: vi.fn() }));
vi.mock("../../stores/toastStore", () => ({ default: (selector) => selector({ showToast }) }));
vi.mock("../../hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: vi.fn(), getDirtyTitle: (title) => title }),
}));
vi.mock("../../lib/routeBase.jsx", () => ({ useEditorPath: () => (path) => path }));
vi.mock("../../components/layout/PageLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../components/ui/LoadingSpinner", () => ({ default: () => <p>spinner</p> }));
vi.mock("../../components/menus/MenuForm", () => ({ default: ({ initialData }) => <p>editing {initialData.name}</p> }));

const { default: MenusEdit } = await import("../MenusEdit.jsx");

let pending;
beforeEach(() => {
  params = { id: "main" };
  search = "";
  pending = {};
  showToast.mockReset();
  getMenu.mockReset().mockImplementation(
    (id, language) => new Promise((resolve, reject) => (pending[`${id}|${language ?? ""}`] = { resolve, reject })),
  );
});
afterEach(cleanup);

const answer = (key, name) => act(async () => pending[key].resolve({ id: key.split("|")[0], name, items: [] }));
const open = () => render(<MenusEdit />, { wrapper: MemoryRouter });

describe("the menu editor while its menu loads", () => {
  it("shows a spinner, then the form for the loaded menu", async () => {
    open();
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("main|", "Main");
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("editing Main")).toBeInTheDocument();
  });

  it("shows the spinner again for another menu, until that menu arrives", async () => {
    const { rerender } = open();
    await answer("main|", "Main");
    params = { id: "footer" };
    rerender(<MenusEdit />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    expect(screen.queryByText("editing Main")).toBeNull();
    await answer("footer|", "Footer");
    expect(screen.getByText("editing Footer")).toBeInTheDocument();
  });

  it("loads the menu again in another language", async () => {
    const { rerender } = open();
    await answer("main|", "Main");
    search = "language=el";
    rerender(<MenusEdit />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("main|el", "Kyrio");
    expect(screen.getByText("editing Kyrio")).toBeInTheDocument();
  });

  it("reports a menu that can't be loaded and says it wasn't found", async () => {
    open();
    await act(async () => pending["main|"].reject(new Error("Menu not found")));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("menusEdit.notFound")).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith("Menu not found", "error");
  });

  it("loads the same way under StrictMode", async () => {
    const replies = [];
    getMenu.mockImplementation(() => new Promise((resolve) => replies.push(resolve)));
    render(
      <StrictMode>
        <MenusEdit />
      </StrictMode>,
      { wrapper: MemoryRouter },
    );
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await act(async () => replies.forEach((resolve) => resolve({ id: "main", name: "Main", items: [] })));
    expect(screen.getByText("editing Main")).toBeInTheDocument();
  });
});
