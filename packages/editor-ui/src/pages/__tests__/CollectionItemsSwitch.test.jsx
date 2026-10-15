// @vitest-environment jsdom
/**
 * Switching from one collection's list to another's keeps the route mounted.
 * Nothing begun on the first collection may then act on the second: a refresh
 * due after an edit there, or a delete confirmation opened there.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getCollectionItems = vi.fn();
const duplicateCollectionItem = vi.fn();
const deleteCollectionItem = vi.fn();
let currentType = "news";
let extraLanguages = [];

const schema = (type, plural) => ({ type, slugPrefix: type, displayName: plural, displayNamePlural: plural, hasItemPages: true, settings: [] });

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

import CollectionItems from "../CollectionItems.jsx";

const item = (slug, title) => ({ id: slug, slug, uuid: `u-${slug}`, title, language: "en", settings: {} });
const NEWS = [item("launch", "Launch day"), item("shared", "News shared")];
const SERVICES = [item("shared", "Services shared")];

/** Each collection's next reply, settled by the test. */
let pending;
beforeEach(() => {
  currentType = "news";
  extraLanguages = [];
  pending = {};
  getCollectionItems.mockReset().mockImplementation(
    (type) => new Promise((resolve) => (pending[type] = resolve)),
  );
  duplicateCollectionItem.mockReset();
  deleteCollectionItem.mockReset().mockResolvedValue({});
});

async function settle(type, items) {
  await act(async () => pending[type](items));
}

function openRowMenu(title) {
  const row = screen.getByText(title).closest("tr");
  fireEvent.click(row.querySelector('[aria-haspopup="menu"]'));
}

async function switchTo(type, rerender) {
  currentType = type;
  rerender(<CollectionItems />);
}

describe("switching collection on the item list", () => {
  it("does not let a refresh due after an edit on the first collection fill the second's list", async () => {
    const { rerender } = render(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("news", NEWS);

    let finishDuplicate;
    duplicateCollectionItem.mockImplementation(() => new Promise((resolve) => (finishDuplicate = resolve)));
    openRowMenu("Launch day");
    fireEvent.click(screen.getByText("collections.actions.duplicate"));

    await switchTo("services", rerender);
    await act(async () => finishDuplicate({})); // News's refresh would start now
    await settle("services", SERVICES);
    if (pending.news) await settle("news", NEWS);

    expect(screen.getByText("Services shared")).toBeTruthy();
    expect(screen.queryByText("Launch day")).toBeNull();
  });

  it("closes a delete confirmation opened on the first collection, so it cannot delete from the second", async () => {
    const { rerender } = render(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("news", NEWS);
    openRowMenu("News shared");
    fireEvent.click(screen.getByText("collections.actions.delete"));
    expect(screen.getByText("collections.deleteModal.confirm")).toBeTruthy();

    await switchTo("services", rerender);
    await settle("services", SERVICES);

    expect(screen.queryByText("collections.deleteModal.confirm")).toBeNull();
    expect(deleteCollectionItem).not.toHaveBeenCalled();
  });

  it("keeps the language tab being looked at when switching collection", async () => {
    extraLanguages = ["el"];
    const { rerender } = render(<CollectionItems />, { wrapper: MemoryRouter });
    await settle("news", NEWS); // English
    await settle("news", []); // Greek
    fireEvent.click(screen.getByRole("tab", { name: /Ελληνικά/ }));

    await switchTo("services", rerender);
    await settle("services", SERVICES);
    await settle("services", []);

    expect(screen.getByRole("tab", { name: /Ελληνικά/ }).getAttribute("aria-selected")).toBe("true");
  });
});
