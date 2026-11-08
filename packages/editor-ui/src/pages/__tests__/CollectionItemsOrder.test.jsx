// @vitest-environment jsdom
/**
 * The item list shows the order the server gave, and a drag shows its new order
 * at once (before the server answers). Fetching again, after a failed reorder or
 * on another collection, shows the server's order once more.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getCollectionItems = vi.fn();
const duplicateCollectionItem = vi.fn();
const deleteCollectionItem = vi.fn();
let currentType = "news";
let extraLanguages = [];

const schema = (type, plural) => ({
  type,
  slugPrefix: type,
  displayName: plural,
  displayNamePlural: plural,
  hasItemPages: true,
  sortable: true,
  settings: [],
});

vi.mock("../../stores/projectStore", async () => {
  const state = () => ({ activeProject: { id: "p1", defaultLanguage: "en", languages: extraLanguages } });
  const hook = (selector) => (selector ? selector(state()) : state());
  hook.getState = state;
  return {
    default: hook,
    useDefaultLanguage: () => "en",
    useExtraLanguages: () => extraLanguages,
    useIsMultilang: () => extraLanguages.length > 0,
  };
});
vi.mock("../../stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../queries/collectionManager", () => ({
  getCollectionItems: (...args) => getCollectionItems(...args),
  duplicateCollectionItem: (...args) => duplicateCollectionItem(...args),
  deleteCollectionItem: (...args) => deleteCollectionItem(...args),
  bulkDeleteCollectionItems: vi.fn(),
  reorderCollectionItems: vi.fn(),
  createItemLanguageVersion: vi.fn(),
}));
vi.mock("../../hooks/useCollections", () => ({
  default: () => ({ schemas: [schema("news", "News"), schema("services", "Services")], loading: false }),
}));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../hooks/useLinkTargets", () => ({ invalidateLinkTargetsCache: vi.fn() }));
vi.mock("../../components/layout/PageLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => vi.fn(),
  useParams: () => ({ type: currentType }),
}));
// The table is replaced by the rows' titles in order, and a button that drags
// the last row to the top.
vi.mock("../../components/ui/Table", () => ({
  default: ({ data, sortable, onReorder }) => (
    <div>
      <ol data-testid="rows">
        {data.map((row) => (
          <li key={row.slug}>{row.title}</li>
        ))}
      </ol>
      {sortable && (
        <button type="button" onClick={() => onReorder([data[data.length - 1], ...data.slice(0, -1)])}>
          drag last to top
        </button>
      )}
    </div>
  ),
}));

const { reorderCollectionItems } = await import("../../queries/collectionManager");
const { default: CollectionItems } = await import("../CollectionItems.jsx");

const item = (slug, title) => ({ id: slug, slug, uuid: `u-${slug}`, title, language: "en", settings: {} });
const NEWS = [item("one", "One"), item("two", "Two"), item("three", "Three")];
const SERVICES = [item("cleaning", "Cleaning")];

let pending;
beforeEach(() => {
  currentType = "news";
  extraLanguages = [];
  pending = {};
  getCollectionItems.mockReset().mockImplementation((type) => new Promise((resolve) => (pending[type] = resolve)));
  reorderCollectionItems.mockReset().mockResolvedValue({});
});

const settle = async (type, items) => act(async () => pending[type](items));
const shown = () => [...screen.getByTestId("rows").children].map((li) => li.textContent);

describe("the item list's order", () => {
  it("shows the server's order", async () => {
    render(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("news", NEWS);
    expect(shown()).toEqual(["One", "Two", "Three"]);
  });

  it("shows a dragged order before the server answers, and keeps it while the list re-renders", async () => {
    let answer;
    reorderCollectionItems.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { rerender } = render(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("news", NEWS);
    fireEvent.click(screen.getByText("drag last to top"));
    expect(shown()).toEqual(["Three", "One", "Two"]);
    expect(reorderCollectionItems).toHaveBeenCalledWith("news", ["three", "one", "two"], "en");
    rerender(<CollectionItems />, { wrapper: MemoryRouter });
    expect(shown()).toEqual(["Three", "One", "Two"]);

    await act(async () => answer({}));
    expect(shown()).toEqual(["Three", "One", "Two"]);
    expect(getCollectionItems).toHaveBeenCalledTimes(1);
  });

  it("goes back to the server's order when the server refuses the new one", async () => {
    reorderCollectionItems.mockRejectedValue(new Error("refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("news", NEWS);
    await act(async () => fireEvent.click(screen.getByText("drag last to top")));
    await settle("news", NEWS);
    expect(shown()).toEqual(["One", "Two", "Three"]);
  });

  it("shows the other collection's items after a switch", async () => {
    const { rerender } = render(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("news", NEWS);
    await act(async () => fireEvent.click(screen.getByText("drag last to top")));
    currentType = "services";
    rerender(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("services", SERVICES);
    expect(shown()).toEqual(["Cleaning"]);
  });
});
