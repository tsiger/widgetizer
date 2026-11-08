// @vitest-environment jsdom
/**
 * The page settings form shows a spinner until its page has loaded, and again when
 * the screen moves to another page (a slug changed on save) or language, until that
 * page arrives. A page that can't be loaded is reported.
 */
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getPage = vi.fn();
const showToast = vi.fn();
let params = { id: "about" };
let search = "";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => params,
  useSearchParams: () => [new URLSearchParams(search)],
  useNavigate: () => vi.fn(),
}));
const updatePage = vi.fn();
vi.mock("../../queries/pageManager", () => ({ getPage: (...args) => getPage(...args), updatePage: (...args) => updatePage(...args) }));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../hooks/useLinkTargets", () => ({ invalidateLinkTargetsCache: vi.fn() }));
vi.mock("../../stores/toastStore", () => ({ default: (selector) => selector({ showToast }) }));
vi.mock("../../hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: vi.fn(), getDirtyTitle: (title) => title }),
}));
vi.mock("../../lib/routeBase.jsx", () => ({ useEditorPath: () => (path) => path }));
vi.mock("../../components/layout/PageLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../components/ui/LoadingSpinner", () => ({ default: () => <p>spinner</p> }));
vi.mock("../../components/pages/PageForm", () => ({
  default: ({ initialData, onSubmit }) => (
    <div>
      <p>editing {initialData.name}</p>
      <button type="button" onClick={() => onSubmit({ name: "About us", slug: "about-us" })}>
        save as about-us
      </button>
    </div>
  ),
}));

const { default: PagesEdit } = await import("../PagesEdit.jsx");

let pending;
beforeEach(() => {
  params = { id: "about" };
  search = "";
  pending = {};
  showToast.mockReset();
  getPage.mockReset().mockImplementation(
    (id, language) => new Promise((resolve, reject) => (pending[`${id}|${language ?? ""}`] = { resolve, reject })),
  );
});
afterEach(cleanup);

const answer = (key, name) => act(async () => pending[key].resolve({ id: key.split("|")[0], name }));
const open = () => render(<PagesEdit />, { wrapper: MemoryRouter });

describe("the page settings form while its page loads", () => {
  it("shows a spinner, then the form for the loaded page", async () => {
    open();
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("about|", "About");
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("editing About")).toBeInTheDocument();
  });

  it("shows the spinner again for another page, until that page arrives", async () => {
    const { rerender } = open();
    await answer("about|", "About");
    params = { id: "about-us" };
    rerender(<PagesEdit />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    expect(screen.queryByText("editing About")).toBeNull();
    await answer("about-us|", "About us");
    expect(screen.getByText("editing About us")).toBeInTheDocument();
  });

  it("loads the page again in another language", async () => {
    const { rerender } = open();
    await answer("about|", "About");
    search = "language=el";
    rerender(<PagesEdit />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("about|el", "Schetika");
    expect(screen.getByText("editing Schetika")).toBeInTheDocument();
  });

  it("reports a page that can't be loaded and shows no form", async () => {
    open();
    await act(async () => pending["about|"].reject(new Error("Page not found")));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.queryByText(/^editing/)).toBeNull();
    expect(showToast).toHaveBeenCalledWith("Page not found", "error");
  });

  it("loads the same way under StrictMode", async () => {
    const replies = [];
    getPage.mockImplementation(() => new Promise((resolve) => replies.push(resolve)));
    render(
      <StrictMode>
        <PagesEdit />
      </StrictMode>,
      { wrapper: MemoryRouter },
    );
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await act(async () => replies.forEach((resolve) => resolve({ id: "about", name: "About" })));
    expect(screen.getByText("editing About")).toBeInTheDocument();
  });

  it("after a save that changes the slug, shows the spinner, then the renamed page and the way back", async () => {
    updatePage.mockResolvedValue({ success: true, data: { id: "about-us", name: "About us" } });
    const { rerender } = open();
    await answer("about|", "About");
    await act(async () => screen.getByText("save as about-us").click());
    expect(updatePage).toHaveBeenCalledWith("about", { name: "About us", slug: "about-us", language: undefined });
    // The form asks to go to the new address; the route follows.
    params = { id: "about-us" };
    rerender(<PagesEdit />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("about-us|", "About us");
    expect(screen.getByText("editing About us")).toBeInTheDocument();
    expect(screen.getByText("pagesEdit.backToList")).toBeInTheDocument();
  });
});
