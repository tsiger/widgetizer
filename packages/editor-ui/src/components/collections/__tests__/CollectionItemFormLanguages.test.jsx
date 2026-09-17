// @vitest-environment jsdom
/**
 * The language menu on a collection item (§9a). Its group comes from the one
 * endpoint built for that question rather than from loading every language's
 * list, and the members it returns carry their own uuids — they are only a group
 * once the group's id is put back on them.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getTranslationGroup = vi.fn();
const createItemLanguageVersion = vi.fn();
const discardArchivedCollectionItem = vi.fn();
const navigate = vi.fn();
let projectState;

vi.mock("../../../stores/projectStore", async () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return {
    default: hook,
    useDefaultLanguage: () => projectState.activeProject?.defaultLanguage || "en",
    useExtraLanguages: () => projectState.activeProject?.languages || [],
    useIsMultilang: () => (projectState.activeProject?.languages?.length ?? 0) > 0,
  };
});
vi.mock("../../../stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../../queries/collectionManager", () => ({
  getTranslationGroup: (...args) => getTranslationGroup(...args),
  createItemLanguageVersion: (...args) => createItemLanguageVersion(...args),
  discardArchivedCollectionItem: (...args) => discardArchivedCollectionItem(...args),
}));
vi.mock("../../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../settings/SettingsRenderer", () => ({ default: () => null }));
vi.mock("../../settings/SeoFields", () => ({ default: () => null }));
vi.mock("../../../hooks/useThemeLocale", () => ({ useThemeLocale: () => ({ tTheme: (value) => value }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
// Confirm immediately, so the discard reaches the query helper.
vi.mock("../../../hooks/useConfirmationAction", () => ({
  default: (action) => ({ confirm: (options) => action(options?.data), confirmationModal: null }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import CollectionItemForm from "../CollectionItemForm.jsx";

const SCHEMA = { type: "news", slugPrefix: "news", displayName: "Story", displayNamePlural: "News", settings: [] };
const ITEM = {
  id: "launch",
  slug: "launch",
  uuid: "u-launch",
  translationGroupId: "u-launch",
  title: "Launch day",
  language: "en",
  settings: {},
};

const renderForm = (initialData = ITEM) =>
  render(<CollectionItemForm schema={SCHEMA} initialData={initialData} onSubmit={vi.fn()} />, {
    wrapper: MemoryRouter,
  });

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "collections.languages.menuLabel" }));

beforeEach(() => {
  navigate.mockReset();
  createItemLanguageVersion.mockReset();
  getTranslationGroup.mockReset().mockResolvedValue({ groupId: "u-launch", members: [] });
  discardArchivedCollectionItem.mockReset().mockResolvedValue({});
  projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } };
});
afterEach(cleanup);

describe("collection item language menu", () => {
  it("asks for the item's group, and opens the sibling it reports", async () => {
    getTranslationGroup.mockResolvedValue({
      groupId: "u-launch",
      members: [
        { kind: "item", collectionType: "news", language: "en", uuid: "u-launch", slug: "launch", name: "Launch day" },
        { kind: "item", collectionType: "news", language: "el", uuid: "u-kal", slug: "kalimera", name: "Kalimera" },
      ],
    });
    renderForm();
    await waitFor(() => expect(getTranslationGroup).toHaveBeenCalledWith("u-launch"));
    openMenu();

    fireEvent.click(await screen.findByText("Ελληνικά"));
    expect(navigate).toHaveBeenCalledWith("/collections/news/kalimera/edit?language=el");
  });

  it("ignores members of another collection, and of the page kind", async () => {
    getTranslationGroup.mockResolvedValue({
      groupId: "u-launch",
      members: [
        { kind: "page", language: "el", uuid: "u-page", slug: "sxetika", name: "Sxetika" },
        { kind: "item", collectionType: "events", language: "el", uuid: "u-ev", slug: "party", name: "Party" },
      ],
    });
    renderForm();
    await waitFor(() => expect(getTranslationGroup).toHaveBeenCalled());
    openMenu();

    // Nothing of this collection exists in Greek, so the menu offers to create it.
    expect(await screen.findByRole("button", { name: "common.languages.create" })).toBeTruthy();
  });

  it("creates the missing version from the item being edited, then opens it", async () => {
    createItemLanguageVersion.mockResolvedValue({ slug: "kalimera", language: "el" });
    renderForm();
    await waitFor(() => expect(getTranslationGroup).toHaveBeenCalled());
    openMenu();

    fireEvent.click(await screen.findByRole("button", { name: "common.languages.create" }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/collections/news/kalimera/edit?language=el"),
    );
    expect(createItemLanguageVersion).toHaveBeenCalledWith("news", "launch", {
      targetLanguage: "el",
      sourceLanguage: "en",
    });
  });

  it("still offers the menu when the group cannot be read", async () => {
    getTranslationGroup.mockRejectedValue(new Error("boom"));
    renderForm();
    await waitFor(() => expect(getTranslationGroup).toHaveBeenCalled());
    openMenu();

    expect(await screen.findByRole("button", { name: "common.languages.create" })).toBeTruthy();
  });

  it("is absent on an item that has never been saved, and on a single-language site", async () => {
    renderForm({ slug: "", settings: {} });
    expect(screen.queryByRole("button", { name: "collections.languages.menuLabel" })).toBeNull();
    expect(getTranslationGroup).not.toHaveBeenCalled();

    cleanup();
    projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: [] } };
    renderForm();
    expect(screen.queryByRole("button", { name: "collections.languages.menuLabel" })).toBeNull();
  });
});

// Archived values live beside the item they belong to, one file per language.
describe("discarding a translated item's archived fields", () => {
  it("names the item's own language", async () => {
    renderForm({ ...ITEM, language: "el", slug: "kalimera", _archived: { oldField: "x" } });
    await waitFor(() => expect(getTranslationGroup).toHaveBeenCalled());

    fireEvent.click(screen.getByText("collectionsForm.discardArchived"));

    await waitFor(() =>
      expect(discardArchivedCollectionItem).toHaveBeenCalledWith("news", "kalimera", "el"),
    );
  });
});
