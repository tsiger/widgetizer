// @vitest-environment jsdom
/**
 * A collection's items once a site has more than one language (§9a): the same
 * three controls as pages, because there is no argument for a second translation
 * workflow in one product.
 *
 * Unlike pages, the item listing is per language — the hook asks once per
 * language and merges, so tabs, count and chips all come from one list.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getCollectionItems = vi.fn();
const createItemLanguageVersion = vi.fn();
const deleteCollectionItem = vi.fn();
const duplicateCollectionItem = vi.fn();
const bulkDeleteCollectionItems = vi.fn();
const reorderCollectionItems = vi.fn();
const navigate = vi.fn();
const showToast = vi.fn();
let projectState;

const SCHEMA = {
  type: "news",
  slugPrefix: "news",
  displayName: "Story",
  displayNamePlural: "News",
  hasItemPages: true,
  settings: [],
};

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
vi.mock("../../queries/collectionManager", () => ({
  getCollectionItems: (...args) => getCollectionItems(...args),
  createItemLanguageVersion: (...args) => createItemLanguageVersion(...args),
  deleteCollectionItem: (...args) => deleteCollectionItem(...args),
  duplicateCollectionItem: (...args) => duplicateCollectionItem(...args),
  bulkDeleteCollectionItems: (...args) => bulkDeleteCollectionItems(...args),
  reorderCollectionItems: (...args) => reorderCollectionItems(...args),
}));
vi.mock("../../hooks/useCollections", () => ({ default: () => ({ schemas: [SCHEMA], loading: false }) }));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../hooks/useLinkTargets", () => ({ invalidateLinkTargetsCache: vi.fn() }));
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
  useTranslation: () => ({ t: (key, opts) => (opts?.count === undefined ? key : `${key}:${opts.count}`) }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => ({ type: "news" }),
}));

import CollectionItems from "../CollectionItems.jsx";

// The English story was never rewritten to record a group, so it answers to its
// own uuid — the id its versions carry.
const EN_STORY = {
  id: "launch",
  slug: "launch",
  uuid: "u-launch",
  translationGroupId: "u-launch",
  title: "Launch day",
  language: "en",
  updated: "2026-01-01",
};
const EL_STORY = {
  id: "kalimera",
  slug: "kalimera",
  uuid: "u-kalimera",
  translationGroupId: "u-launch",
  title: "Kalimera",
  language: "el",
  updated: "2026-01-01",
};
const EN_ALONE = {
  id: "hiring",
  slug: "hiring",
  uuid: "u-hiring",
  translationGroupId: "u-hiring",
  title: "We are hiring",
  language: "en",
  updated: "2026-01-01",
};

const renderList = () => render(<CollectionItems />, { wrapper: MemoryRouter });
const tab = (name) => screen.getByRole("tab", { name: new RegExp(name) });
// The tabs render above the table, so they appear a beat before the rows do.
const ready = async (anchor) => {
  await screen.findByRole("tablist");
  if (anchor) await screen.findByText(anchor);
};

beforeEach(() => {
  navigate.mockReset();
  showToast.mockReset();
  createItemLanguageVersion.mockReset();
  deleteCollectionItem.mockReset().mockResolvedValue({ success: true });
  duplicateCollectionItem.mockReset().mockResolvedValue({});
  bulkDeleteCollectionItems.mockReset().mockResolvedValue({});
  reorderCollectionItems.mockReset().mockResolvedValue({});
  projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } };
  getCollectionItems.mockReset().mockImplementation(async (type, params) =>
    params?.language === "el" ? [EL_STORY] : [EN_STORY, EN_ALONE],
  );
});

describe("collection items language tabs", () => {
  it("asks each language once and shows only the active one", async () => {
    renderList();
    await ready("Launch day");

    expect(getCollectionItems.mock.calls.map((call) => call[1]?.language)).toEqual([undefined, "el"]);
    expect(screen.queryByText("Kalimera")).toBeNull();

    fireEvent.click(tab("Ελληνικά"));
    expect(screen.getByText("Kalimera")).toBeTruthy();
    expect(screen.queryByText("Launch day")).toBeNull();
  });

  it("counts the active language's items, not every language's", async () => {
    renderList();
    await ready("collections.count:2");

    fireEvent.click(tab("Ελληνικά"));
    expect(screen.getByText("collections.count:1")).toBeTruthy();
  });

  it("starts a new item in the language being looked at", async () => {
    renderList();
    await ready("Launch day");

    fireEvent.click(tab("Ελληνικά"));
    fireEvent.click(screen.getByRole("button", { name: "collections.newItem" }));
    expect(navigate).toHaveBeenCalledWith("/collections/news/add?language=el");
  });

  it("keeps the tabs when the whole collection is empty, and starts the first item in the chosen one", async () => {
    getCollectionItems.mockResolvedValue([]);
    renderList();
    await ready();

    fireEvent.click(tab("Ελληνικά"));
    fireEvent.click(screen.getByRole("button", { name: "collections.newItem" }));
    expect(navigate).toHaveBeenCalledWith("/collections/news/add?language=el");
  });

  it("shows no tabs and no chips while the site has one language", async () => {
    projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: [] } };
    renderList();

    await screen.findByText("Launch day");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("link", { name: "common.languages.open" })).toBeNull();
    expect(getCollectionItems.mock.calls.map((call) => call[1]?.language)).toEqual([undefined]);
  });
});

describe("collection item translation chips", () => {
  it("links to the sibling that exists, by its own slug and language", async () => {
    renderList();
    await ready("Launch day");

    const chip = screen.getByRole("link", { name: "common.languages.open" });
    expect(chip.textContent).toBe("el");
    expect(chip.getAttribute("href")).toBe("/collections/news/kalimera/edit?language=el");
  });

  it("creates the one that is missing, from the row's own language", async () => {
    createItemLanguageVersion.mockResolvedValue({ slug: "proslambanoume", language: "el" });
    renderList();
    await ready("Launch day");

    fireEvent.click(screen.getByRole("button", { name: "common.languages.create" }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/collections/news/proslambanoume/edit?language=el"),
    );
    expect(createItemLanguageVersion).toHaveBeenCalledWith("news", "hiring", {
      targetLanguage: "el",
      sourceLanguage: "en",
    });
  });

  it("reports the server's reason and stays put", async () => {
    createItemLanguageVersion.mockRejectedValue(new Error('An item in "el" already exists for this group.'));
    renderList();
    await ready("Launch day");

    fireEvent.click(screen.getByRole("button", { name: "common.languages.create" }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('An item in "el" already exists for this group.', "error"),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

// A slug is unique per language, so an action naming only the slug acts on
// whichever item the DEFAULT language happens to hold.
describe("collection item actions stay in the row's language", () => {
  const openRowMenu = async () => {
    fireEvent.click(tab("Ελληνικά"));
    await screen.findByText("Kalimera");
    fireEvent.click(screen.getByRole("button", { name: "collections.actions.menu" }));
  };

  it("deletes the item of the language being looked at", async () => {
    renderList();
    await ready("Launch day");
    await openRowMenu();

    fireEvent.click(screen.getByRole("button", { name: /collections\.actions\.delete/ }));
    fireEvent.click(await screen.findByRole("button", { name: "collections.deleteModal.confirm" }));

    await waitFor(() => expect(deleteCollectionItem).toHaveBeenCalledWith("news", "kalimera", "el"));
  });

  it("duplicates within that language", async () => {
    renderList();
    await ready("Launch day");
    await openRowMenu();

    fireEvent.click(screen.getByRole("button", { name: /collections\.actions\.duplicate/ }));
    await waitFor(() => expect(duplicateCollectionItem).toHaveBeenCalledWith("news", "kalimera", "el"));
  });

  it("bulk-deletes within the active tab", async () => {
    renderList();
    await ready("Launch day");
    fireEvent.click(tab("Ελληνικά"));
    await screen.findByText("Kalimera");

    // The row checkbox is the first button in the row.
    fireEvent.click(screen.getAllByRole("button")[1]);
    fireEvent.click(await screen.findByRole("button", { name: /collections\.delete$/ }));
    fireEvent.click(await screen.findByRole("button", { name: /collections\.deleteModal\.confirmBulk/ }));

    await waitFor(() => expect(bulkDeleteCollectionItems).toHaveBeenCalledWith("news", ["kalimera"], "el"));
  });
});
