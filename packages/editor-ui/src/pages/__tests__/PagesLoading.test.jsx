// @vitest-environment jsdom
/**
 * The pages list while it loads: nothing to load without a project; the spinner
 * until the list arrives; another project clears the selection and shows the
 * spinner until its own list arrives.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

const EN_ABOUT = { id: "about", slug: "about", uuid: "u-about", name: "About", language: "en", updated: "2026-01-01" };
const EN_CAREERS = { id: "careers", slug: "careers", uuid: "u-careers", name: "Careers", language: "en", updated: "2026-01-01" };

const renderList = () => render(<Pages />, { wrapper: MemoryRouter });
let pending;
beforeEach(() => {
  pending = [];
  getAllPages.mockReset().mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
  showToast.mockReset();
  projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: [] } };
});
const answerLast = (pages) => act(async () => pending[pending.length - 1].resolve(pages));
const spinnerShown = () => !!document.querySelector(".animate-spin") || !!screen.queryByText(/^pages\.loading/);
// A row is selected through the button in its first cell, and shows it with its highlight.
const selectButton = (name) => screen.getByText(name).closest("tr").querySelector("td button");
const isSelected = (name) => screen.getByText(name).closest("tr").querySelector("td").className.includes("bg-pink-50");

describe("the pages list while it loads", () => {
  it("has nothing to load without a project", async () => {
    projectState = { activeProject: null };
    renderList();
    await act(async () => {});
    expect(getAllPages).not.toHaveBeenCalled();
    expect(spinnerShown()).toBe(false);
  });

  it("shows the spinner until the list arrives", async () => {
    renderList();
    expect(spinnerShown()).toBe(true);
    await answerLast([EN_ABOUT]);
    expect(spinnerShown()).toBe(false);
    expect(screen.getByText("About")).toBeTruthy();
  });

  it("clears the selection and shows the spinner for another project, until its list arrives", async () => {
    const { rerender } = renderList();
    await answerLast([EN_ABOUT, EN_CAREERS]);
    fireEvent.click(selectButton("About"));
    expect(isSelected("About")).toBe(true);

    projectState = { activeProject: { id: "p2", defaultLanguage: "en", languages: [] } };
    rerender(<Pages />);
    expect(spinnerShown()).toBe(true);
    await answerLast([EN_ABOUT]);
    expect(isSelected("About")).toBe(false);
  });
});
