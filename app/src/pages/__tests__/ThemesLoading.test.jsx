// @vitest-environment jsdom
/**
 * The themes screen shows its spinner until the list arrives, asking for it
 * once, without forcing a refresh.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getAllThemes = vi.fn();
const showToast = vi.fn();

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("@widgetizer/editor-ui/queries/themeManager", () => ({
  getAllThemes: (...args) => getAllThemes(...args),
  getThemeScreenshotUrl: () => "",
  getThemePresets: async () => ({ default: null, presets: [] }),
  getPresetScreenshotUrl: () => "",
  uploadThemeZip: vi.fn(),
  updateTheme: vi.fn(),
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
  showToast.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Themes while the list loads", () => {
  it("shows the spinner until the list arrives, then the themes", async () => {
    let answer;
    getAllThemes.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    renderThemes();
    expect(screen.getByText("themes.loading")).toBeTruthy();
    expect(getAllThemes).toHaveBeenCalledTimes(1);
    expect(getAllThemes).toHaveBeenCalledWith(undefined);
    await act(async () => answer([THEME]));
    expect(document.querySelector(".animate-spin")).toBeNull();
    expect(screen.getByText("Arch")).toBeTruthy();
  });
});
