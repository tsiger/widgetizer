// @vitest-environment jsdom
/**
 * Duplicating a page: when the route refuses with its own message the toast
 * shows it; with no message to show the toast keeps the generic text.
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


import { ApiError } from "../../lib/apiFetch";

const ABOUT = { id: "about", slug: "about", uuid: "u-about", name: "About", language: "en", updated: "2026-01-01" };

async function duplicateAbout() {
  getAllPages.mockResolvedValue([ABOUT]);
  render(<Pages />, { wrapper: MemoryRouter });
  await screen.findByText("About");
  const row = screen.getByText("About").closest("tr");
  const buttons = row.querySelectorAll("button");
  await act(async () => fireEvent.click(buttons[buttons.length - 1]));
  await act(async () => fireEvent.click(screen.getByText("pages.actions.duplicate")));
}

beforeEach(() => {
  getAllPages.mockReset();
  duplicatePage.mockReset();
  showToast.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: [] } };
});

describe("duplicating a page", () => {
  it("shows the route's own message when it refuses", async () => {
    const message = "Storage is full. Delete files or upgrade to add more.";
    duplicatePage.mockRejectedValue(
      new ApiError(message, { status: 413, code: "STORAGE_FULL", data: { error: message, code: "STORAGE_FULL" } }),
    );

    await duplicateAbout();

    expect(showToast).toHaveBeenCalledWith(message, "error");
  });

  it("keeps the generic text when the failure carries no message", async () => {
    duplicatePage.mockRejectedValue(new Error("Failed to duplicate page"));

    await duplicateAbout();

    expect(showToast).toHaveBeenCalledWith("pages.toasts.duplicateError", "error");
  });
});
