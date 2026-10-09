// @vitest-environment jsdom
/**
 * Site settings saves: one at a time, and every outcome reported as text — a
 * warning object once rendered as "[object Object]".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const getThemeSettings = vi.fn();
const saveThemeSettingChanges = vi.fn();
const showToast = vi.fn();
let projectState;

vi.mock("../../queries/themeManager", () => ({
  getThemeSettings: (...args) => getThemeSettings(...args),
  saveThemeSettingChanges: (...args) => saveThemeSettingChanges(...args),
}));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return { default: hook };
});
vi.mock("../../stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
const guard = vi.hoisted(() => ({ options: null }));
vi.mock("../../hooks/useGuardedFormPage", () => ({
  default: (_dirty, options) => {
    guard.options = options;
    return { getDirtyTitle: (title) => title };
  },
}));
vi.mock("../../components/layout/PageLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../../components/settings", () => ({
  SettingsPanel: ({ onChange }) => (
    <button type="button" onClick={() => onChange("accent", "#0000ff")}>
      change accent
    </button>
  ),
}));

import Settings from "../Settings.jsx";
import useThemeStore from "../../stores/themeStore";

const THEME = {
  version: "1.0.0",
  settings: { global: { colors: [{ id: "accent", type: "color", label: "Accent", value: "#ff0000" }] } },
};
const saved = (value) => ({
  ...THEME,
  settings: { global: { colors: [{ ...THEME.settings.global.colors[0], value }] } },
});

async function openAndEdit() {
  render(<Settings />);
  fireEvent.click(await screen.findByText("change accent"));
  return screen.getByRole("button", { name: /common.save/ });
}

beforeEach(() => {
  guard.options = null;
  useThemeStore.getState().reset();
  getThemeSettings.mockReset().mockResolvedValue(JSON.parse(JSON.stringify(THEME)));
  saveThemeSettingChanges.mockReset();
  showToast.mockReset();
  projectState = { activeProject: { id: "project-1" } };
});

describe("Site settings save", () => {
  it("turns Save off while a save is running", async () => {
    let land;
    saveThemeSettingChanges.mockReturnValueOnce(new Promise((resolve) => (land = resolve)));
    const save = await openAndEdit();

    fireEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    land({ theme: saved("#0000ff"), warnings: [] });

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("themeSettings.toasts.saveSuccess", "success"));
    expect(saveThemeSettingChanges).toHaveBeenCalledTimes(1);
  });

  it("shows each warning as text", async () => {
    saveThemeSettingChanges.mockResolvedValueOnce({
      theme: saved("#0000ff"),
      warnings: [{ code: "MEDIA_USAGE_STALE", path: "theme.json" }, { code: "SETTING_REMOVED", id: "old" }],
    });
    fireEvent.click(await openAndEdit());

    await waitFor(() => expect(showToast).toHaveBeenCalled());
    const [message, kind] = showToast.mock.calls[0];
    expect(kind).toBe("warning");
    expect(message).not.toContain("[object Object]");
    expect(message).toContain("themeSettings.toasts.mediaUsageStale");
    expect(message).toContain("themeSettings.toasts.settingRemoved");
  });

  it("says the settings changed elsewhere and keeps the edit unsaved", async () => {
    saveThemeSettingChanges.mockRejectedValueOnce(
      Object.assign(new Error("changed"), { status: 409, code: "THEME_SETTINGS_CHANGED", data: { conflicts: ["accent"] } }),
    );
    getThemeSettings.mockResolvedValueOnce(JSON.parse(JSON.stringify(THEME))).mockResolvedValueOnce(saved("#00ff00"));
    fireEvent.click(await openAndEdit());

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("themeSettings.toasts.conflict", "warning"));
    expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);
  });
});

describe("Site settings discard", () => {
  // Reproduced 2026-10-09: edit a setting, leave and choose "Discard changes",
  // then save anything in the page editor — the discarded value was written to
  // theme.json, because the draft lives in themeStore and outlived the page.
  it("drops the theme draft when the user leaves and discards", async () => {
    await openAndEdit();
    expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);

    guard.options.onDiscard();

    const state = useThemeStore.getState();
    expect(state.hasUnsavedThemeChanges()).toBe(false);
    expect(state.settings.settings.global.colors[0].value).toBe("#ff0000");
  });
});
