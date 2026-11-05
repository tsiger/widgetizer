// @vitest-environment jsdom
/**
 * A theme list that can't be loaded must not read as "No themes available":
 * the themes are installed, only the list didn't load, and the empty state
 * would invite uploading them again.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getAllThemes = vi.fn();
const updateTheme = vi.fn();
const showToast = vi.fn();

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("@widgetizer/editor-ui/queries/themeManager", () => ({
  getAllThemes: (...args) => getAllThemes(...args),
  getThemeScreenshotUrl: () => "",
  getThemePresets: async () => ({ default: null, presets: [] }),
  getPresetScreenshotUrl: () => "",
  uploadThemeZip: vi.fn(),
  updateTheme: (...args) => updateTheme(...args),
  deleteTheme: vi.fn(),
}));
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/stores/themeUpdateStore", () => {
  const state = { fetchUpdateCount: () => {} };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/hooks/useAppSettings", () => ({ default: () => ({ settings: {} }) }));
vi.mock("@widgetizer/editor-ui/components/layout/PageLayout.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("@widgetizer/editor-ui/components/ui/FileUploader.jsx", () => ({
  default: () => <div data-testid="theme-uploader" />,
}));

const { default: Themes } = await import("../Themes.jsx");

const THEME = { id: "arch", name: "Arch", version: "1.0.0", versions: ["1.0.0"], projectsUsingTheme: [] };
const renderThemes = () => render(<Themes />, { wrapper: MemoryRouter });

beforeEach(() => {
  getAllThemes.mockReset();
  updateTheme.mockReset();
  showToast.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Themes — a theme list that can't be loaded", () => {
  it("says so with Try again, offers no upload meanwhile, and Try again loads the list", async () => {
    getAllThemes
      .mockRejectedValueOnce(Object.assign(new Error("Failed to get themes"), { code: "UNEXPECTED_REPLY" }))
      .mockResolvedValue([THEME]);
    renderThemes();

    expect(await screen.findByText("themes.loadFailedTitle")).toBeInTheDocument();
    expect(screen.queryByText("themes.emptyTitle")).toBeNull();
    expect(screen.queryByTestId("theme-uploader")).toBeNull();
    expect(showToast).toHaveBeenCalledWith("themes.toasts.loadError", "error");

    fireEvent.click(screen.getByRole("button", { name: "themes.retry" }));
    expect(await screen.findByText("Arch")).toBeInTheDocument();
    expect(screen.getByTestId("theme-uploader")).toBeInTheDocument();
    expect(screen.queryByText("themes.loadFailedTitle")).toBeNull();
    // The retry asks the server, not the cache that held the failure.
    await waitFor(() => expect(getAllThemes).toHaveBeenLastCalledWith({ forceRefresh: true }));
  });

  it("still invites a first upload when the list loads empty", async () => {
    getAllThemes.mockResolvedValue([]);
    renderThemes();
    expect(await screen.findByText("themes.emptyTitle")).toBeInTheDocument();
    expect(screen.getByTestId("theme-uploader")).toBeInTheDocument();
    expect(screen.queryByText("themes.loadFailedTitle")).toBeNull();
  });

  it("a reload that fails late does not undo a newer one that succeeded", async () => {
    const deferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
    const theme = (id, name) => ({ ...THEME, id, name, hasPendingUpdate: true, latestVersion: "2.0.0" });
    const updateA = deferred();
    const updateB = deferred();
    const reloadA = deferred();
    const reloadB = deferred();
    getAllThemes
      .mockResolvedValueOnce([theme("a", "Alpha"), theme("b", "Beta")])
      .mockReturnValueOnce(reloadA.promise)
      .mockReturnValueOnce(reloadB.promise);
    updateTheme.mockImplementation((id) => (id === "a" ? updateA.promise : updateB.promise));
    renderThemes();

    const [updateAlpha, updateBeta] = await screen.findAllByRole("button", { name: "themes.buttons.update" });
    fireEvent.click(updateAlpha);
    fireEvent.click(updateBeta);
    await act(async () => updateA.resolve({}));
    await act(async () => updateB.resolve({}));
    await act(async () => reloadB.resolve([{ ...THEME, id: "a", name: "Alpha 2" }, { ...THEME, id: "b", name: "Beta 2" }]));
    await act(async () => reloadA.reject(new Error("Failed to get themes")));

    expect(await screen.findByText("Alpha 2")).toBeInTheDocument();
    expect(screen.queryByText("themes.loadFailedStale")).toBeNull();
    expect(showToast).not.toHaveBeenCalledWith("themes.toasts.loadError", "error");
  });
});
