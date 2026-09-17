// @vitest-environment jsdom
/**
 * The pages list once a site has more than one language: tabs that filter, and
 * per-row chips that open a sibling or create the missing one.
 *
 * Every language comes back in the one `getAllPages` call, so the chips are
 * derived from that list rather than asking per row — these tests pin that a
 * row's siblings are found by their shared translation group, including the
 * source that was never rewritten to record one.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getAllPages = vi.fn();
const createPageLanguageVersion = vi.fn();
const deletePage = vi.fn();
const duplicatePage = vi.fn();
const bulkDeletePages = vi.fn();
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
vi.mock("../../stores/pageListStore", () => {
  const state = { notifyPagesChanged: () => {} };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../queries/pageManager", () => ({
  getAllPages: (...args) => getAllPages(...args),
  createPageLanguageVersion: (...args) => createPageLanguageVersion(...args),
  deletePage: (...args) => deletePage(...args),
  duplicatePage: (...args) => duplicatePage(...args),
  bulkDeletePages: (...args) => bulkDeletePages(...args),
}));
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
// Keys echo, but a count has to be visible or the assertion proves nothing.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, opts) => (opts?.count === undefined ? key : `${key}:${opts.count}`) }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import Pages from "../Pages.jsx";

// English "About" was never rewritten to record a group, so it answers to its
// own uuid — which is the id its versions carry.
const EN_ABOUT = { id: "about", slug: "about", uuid: "u-about", name: "About", language: "en", updated: "2026-01-01" };
const EL_ABOUT = {
  id: "sxetika",
  slug: "sxetika",
  uuid: "u-el-about",
  translationGroupId: "u-about",
  name: "Sxetika",
  language: "el",
  updated: "2026-01-01",
};
const EN_ALONE = { id: "careers", slug: "careers", uuid: "u-careers", name: "Careers", language: "en", updated: "2026-01-01" };

const renderList = () => render(<Pages />, { wrapper: MemoryRouter });
const tab = (name) => screen.getByRole("tab", { name: new RegExp(name) });

beforeEach(() => {
  getAllPages.mockReset();
  createPageLanguageVersion.mockReset();
  deletePage.mockReset().mockResolvedValue({ success: true });
  duplicatePage.mockReset().mockResolvedValue({});
  bulkDeletePages.mockReset().mockResolvedValue({});
  navigate.mockReset();
  showToast.mockReset();
  projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } };
  getAllPages.mockResolvedValue([EN_ABOUT, EL_ABOUT, EN_ALONE]);
});

describe("language tabs", () => {
  it("shows one tab per site language and lists only the active one's pages", async () => {
    renderList();
    await screen.findByRole("tablist");

    expect(screen.getAllByRole("tab").map((element) => element.textContent)).toEqual(["English(en)", "Ελληνικά(el)"]);
    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.queryByText("Sxetika")).toBeNull();

    fireEvent.click(tab("Ελληνικά"));
    expect(screen.getByText("Sxetika")).toBeTruthy();
    expect(screen.queryByText("About")).toBeNull();
    expect(screen.queryByText("Careers")).toBeNull();
  });

  it("counts the active language's pages, not every language's", async () => {
    renderList();
    await screen.findByRole("tablist");
    expect(screen.getByText("pages.count:2")).toBeTruthy();

    fireEvent.click(tab("Ελληνικά"));
    expect(screen.getByText("pages.count:1")).toBeTruthy();
  });

  it("starts a new page in the language being looked at", async () => {
    renderList();
    await screen.findByRole("tablist");

    fireEvent.click(tab("Ελληνικά"));
    fireEvent.click(screen.getByRole("button", { name: "pages.newPage" }));
    expect(navigate).toHaveBeenCalledWith("/pages/add?language=el");
  });

  it("shows no tabs at all while the site has one language", async () => {
    projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: [] } };
    getAllPages.mockResolvedValue([EN_ABOUT, EN_ALONE]);
    renderList();

    await screen.findByText("About");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("link", { name: /pages\.languages\.open/ })).toBeNull();
  });
});

describe("translation chips", () => {
  it("links to a sibling that exists, by its own slug and language", async () => {
    renderList();
    await screen.findByRole("tablist");

    const chip = screen.getByRole("link", { name: "common.languages.open" });
    expect(chip.textContent).toBe("el");
    expect(chip.getAttribute("href")).toBe("/page-editor?pageId=sxetika&language=el");
  });

  it("offers to create the one that is missing", async () => {
    renderList();
    await screen.findByRole("tablist");

    const missing = screen.getAllByRole("button", { name: "common.languages.create" });
    expect(missing).toHaveLength(1);
    expect(missing[0].textContent).toBe("el");
  });

  it("creates the version from the row's own language, then opens it", async () => {
    const created = { id: "kariera", slug: "kariera", uuid: "u-new", language: "el" };
    createPageLanguageVersion.mockResolvedValue(created);
    renderList();
    await screen.findByRole("tablist");

    fireEvent.click(screen.getByRole("button", { name: "common.languages.create" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/page-editor?pageId=kariera&language=el"));
    expect(createPageLanguageVersion).toHaveBeenCalledWith("careers", {
      targetLanguage: "el",
      sourceLanguage: "en",
    });
    expect(showToast).toHaveBeenCalledWith("common.languages.created", "success");
  });

  it("reports the server's reason and stays put", async () => {
    createPageLanguageVersion.mockRejectedValue(new Error("A page in \"el\" already exists for this group."));
    renderList();
    await screen.findByRole("tablist");

    fireEvent.click(screen.getByRole("button", { name: "common.languages.create" }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('A page in "el" already exists for this group.', "error"),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("looks back from a translation to its source, which records no group of its own", async () => {
    renderList();
    await screen.findByRole("tablist");
    fireEvent.click(tab("Ελληνικά"));

    const chip = screen.getByRole("link", { name: "common.languages.open" });
    expect(chip.textContent).toBe("en");
    expect(chip.getAttribute("href")).toBe("/page-editor?pageId=about&language=en");
  });
});

// A slug is unique per language, so an action that names only the slug acts on
// whichever page the DEFAULT language happens to hold.
describe("row actions stay in the row's language", () => {
  const openRowMenu = async (name) => {
    fireEvent.click(tab("Ελληνικά"));
    await screen.findByText(name);
    fireEvent.click(screen.getByRole("button", { name: "pages.actions.menu" }));
  };

  it("deletes the page of the language being looked at", async () => {
    renderList();
    await screen.findByRole("tablist");
    await openRowMenu("Sxetika");

    fireEvent.click(screen.getByRole("button", { name: /pages\.actions\.delete/ }));
    fireEvent.click(await screen.findByRole("button", { name: "pages.deleteModal.confirm" }));

    await waitFor(() => expect(deletePage).toHaveBeenCalledWith("sxetika", "el"));
  });

  it("duplicates within that language", async () => {
    renderList();
    await screen.findByRole("tablist");
    await openRowMenu("Sxetika");

    fireEvent.click(screen.getByRole("button", { name: /pages\.actions\.duplicate/ }));
    await waitFor(() => expect(duplicatePage).toHaveBeenCalledWith("sxetika", "el"));
  });

  it("bulk-deletes within the active tab", async () => {
    renderList();
    await screen.findByRole("tablist");
    fireEvent.click(tab("Ελληνικά"));
    await screen.findByText("Sxetika");

    // The row checkbox is the first button in the row.
    fireEvent.click(screen.getAllByRole("button")[1]);
    fireEvent.click(await screen.findByRole("button", { name: /pages\.delete$/ }));
    fireEvent.click(await screen.findByRole("button", { name: /pages\.deleteModal\.confirmBulk/ }));

    await waitFor(() => expect(bulkDeletePages).toHaveBeenCalledWith(["sxetika"], "el"));
  });
});

describe("a multilingual project with no pages yet", () => {
  it("still offers the tabs, and starts the first page in the chosen one", async () => {
    getAllPages.mockResolvedValue([]);
    renderList();
    await screen.findByRole("tablist");

    fireEvent.click(tab("Ελληνικά"));
    fireEvent.click(screen.getByRole("button", { name: "pages.newPage" }));
    expect(navigate).toHaveBeenCalledWith("/pages/add?language=el");
  });
});
