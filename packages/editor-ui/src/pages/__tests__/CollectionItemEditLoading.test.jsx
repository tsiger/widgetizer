// @vitest-environment jsdom
/**
 * The edit-item form shows a spinner until its item and schema have loaded, and
 * again when the screen moves to another item (a slug changed on save, another
 * language), until that item arrives. A late reply for the earlier item is
 * ignored.
 */
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getCollectionSchema = vi.fn();
const getCollectionItem = vi.fn();
const showToast = vi.fn();
let params = { type: "news", slug: "launch" };
let search = "";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, opts) => (opts?.name ? `${key}:${opts.name}` : key) }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => params,
  useSearchParams: () => [new URLSearchParams(search)],
  useNavigate: () => vi.fn(),
}));
vi.mock("../../queries/collectionManager", () => ({
  getCollectionSchema: (...args) => getCollectionSchema(...args),
  getCollectionItem: (...args) => getCollectionItem(...args),
  updateCollectionItem: vi.fn(),
}));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../hooks/useLinkTargets", () => ({ invalidateLinkTargetsCache: vi.fn() }));
vi.mock("../../stores/toastStore", () => ({ default: (selector) => selector({ showToast }) }));
vi.mock("../../hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: vi.fn(), getDirtyTitle: (title) => title }),
}));
vi.mock("../../lib/routeBase.jsx", () => ({ useEditorPath: () => (path) => path }));
vi.mock("../../components/layout/PageLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../components/ui/LoadingSpinner", () => ({ default: () => <p>spinner</p> }));
vi.mock("../../components/collections/CollectionItemForm", () => ({
  default: ({ initialData }) => <p>editing {initialData.title}</p>,
}));

const { default: CollectionItemEdit } = await import("../CollectionItemEdit.jsx");

const SCHEMA = { type: "news", displayName: "News" };
let pending;
beforeEach(() => {
  params = { type: "news", slug: "launch" };
  search = "";
  pending = {};
  showToast.mockReset();
  getCollectionSchema.mockReset().mockResolvedValue(SCHEMA);
  getCollectionItem.mockReset().mockImplementation(
    (type, slug, language) => new Promise((resolve, reject) => (pending[`${slug}|${language ?? ""}`] = { resolve, reject })),
  );
});
afterEach(cleanup);

const answer = (key, title) => act(async () => pending[key].resolve({ slug: key.split("|")[0], title }));
const open = () => render(<CollectionItemEdit />, { wrapper: MemoryRouter });

describe("the edit-item form while its item loads", () => {
  it("shows a spinner, then the form for the loaded item", async () => {
    open();
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("launch|", "Launch day");
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("editing Launch day")).toBeInTheDocument();
  });

  it("shows the spinner again for another item, until that item arrives", async () => {
    const { rerender } = open();
    await answer("launch|", "Launch day");
    params = { type: "news", slug: "launch-day" };
    rerender(<CollectionItemEdit />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    expect(screen.queryByText("editing Launch day")).toBeNull();
    await answer("launch-day|", "Launch day (renamed)");
    expect(screen.getByText("editing Launch day (renamed)")).toBeInTheDocument();
  });

  it("loads the item again in another language", async () => {
    const { rerender } = open();
    await answer("launch|", "Launch day");
    search = "language=el";
    rerender(<CollectionItemEdit />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("launch|el", "Ημέρα έναρξης");
    expect(screen.getByText("editing Ημέρα έναρξης")).toBeInTheDocument();
  });

  it("ignores a reply for the earlier item that comes after the switch", async () => {
    const { rerender } = open();
    params = { type: "news", slug: "other" };
    rerender(<CollectionItemEdit />);
    await answer("other|", "Other");
    await answer("launch|", "Launch day");
    expect(screen.getByText("editing Other")).toBeInTheDocument();
  });

  it("stops the spinner and says so when the item can't be loaded", async () => {
    open();
    await act(async () => pending["launch|"].reject(new Error("Item not found")));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.queryByText(/^editing/)).toBeNull();
    expect(showToast).toHaveBeenCalledWith("Item not found", "error");
  });

  it("says nothing about a load that fails after the form was left", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = open();
    unmount();
    await act(async () => pending["launch|"].reject(new Error("Item not found")));
    expect(showToast).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("loads the same way under StrictMode", async () => {
    const replies = [];
    getCollectionItem.mockImplementation(() => new Promise((resolve) => replies.push(resolve)));
    render(
      <StrictMode>
        <CollectionItemEdit />
      </StrictMode>,
      { wrapper: MemoryRouter },
    );
    expect(screen.getByText("spinner")).toBeInTheDocument();
    // StrictMode runs the load twice; only the second, still-current one may answer.
    await act(async () => replies.forEach((resolve, i) => resolve({ slug: "launch", title: `Launch day #${i + 1}` })));
    expect(screen.getByText(`editing Launch day #${replies.length}`)).toBeInTheDocument();
  });
});
