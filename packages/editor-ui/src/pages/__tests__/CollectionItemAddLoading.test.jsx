// @vitest-environment jsdom
/**
 * The add-item form shows a spinner until its collection's schema has loaded,
 * and again when the screen moves to another collection's form, until that
 * schema arrives. A late reply for the earlier collection is ignored.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getCollectionSchema = vi.fn();
const showToast = vi.fn();
let currentType = "news";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, opts) => (opts?.name ? `${key}:${opts.name}` : key) }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ type: currentType }),
}));
vi.mock("../../queries/collectionManager", () => ({
  getCollectionSchema: (...args) => getCollectionSchema(...args),
  createCollectionItem: vi.fn(),
}));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../hooks/useLinkTargets", () => ({ invalidateLinkTargetsCache: vi.fn() }));
vi.mock("../../stores/toastStore", () => ({ default: (selector) => selector({ showToast }) }));
vi.mock("../../hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: vi.fn(), getDirtyTitle: (title) => title }),
}));
vi.mock("../../lib/routeBase.jsx", () => ({ useEditorPath: () => (path) => path }));
vi.mock("../../components/layout/PageLayout", () => ({
  default: ({ title, children }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));
vi.mock("../../components/ui/LoadingSpinner", () => ({ default: () => <p>spinner</p> }));
vi.mock("../../components/collections/CollectionItemForm", () => ({
  default: ({ schema }) => <p>form for {schema.displayName}</p>,
}));

const { default: CollectionItemAdd } = await import("../CollectionItemAdd.jsx");

let pending;
beforeEach(() => {
  currentType = "news";
  pending = {};
  showToast.mockReset();
  getCollectionSchema.mockReset().mockImplementation(
    (type) => new Promise((resolve, reject) => (pending[type] = { resolve, reject })),
  );
});
afterEach(cleanup);

const answer = (type, schema) => act(async () => pending[type].resolve(schema));
const news = { type: "news", displayName: "News" };
const services = { type: "services", displayName: "Services" };

describe("the add-item form while its schema loads", () => {
  it("shows a spinner, then the form for the loaded schema", async () => {
    render(<CollectionItemAdd />, { wrapper: MemoryRouter });
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answer("news", news);
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("form for News")).toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("collectionsForm.addTitle:News");
  });

  it("shows the spinner again for another collection's form, until its schema arrives", async () => {
    const { rerender } = render(<CollectionItemAdd />, { wrapper: MemoryRouter });
    await answer("news", news);
    currentType = "services";
    rerender(<CollectionItemAdd />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
    expect(screen.queryByText("form for News")).toBeNull();
    await answer("services", services);
    expect(screen.getByText("form for Services")).toBeInTheDocument();
  });

  it("ignores a reply for the earlier collection that comes after the switch", async () => {
    const { rerender } = render(<CollectionItemAdd />, { wrapper: MemoryRouter });
    currentType = "services";
    rerender(<CollectionItemAdd />);
    await answer("services", services);
    await answer("news", news);
    expect(screen.getByText("form for Services")).toBeInTheDocument();
  });

  it("stops the spinner and says so when the schema can't be loaded", async () => {
    render(<CollectionItemAdd />, { wrapper: MemoryRouter });
    await act(async () => pending.news.reject(new Error("No such collection")));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(showToast).toHaveBeenCalledWith("No such collection", "error");
  });

  it("says nothing about a load that fails after the form was left", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<CollectionItemAdd />, { wrapper: MemoryRouter });
    unmount();
    await act(async () => pending.news.reject(new Error("No such collection")));
    expect(showToast).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
