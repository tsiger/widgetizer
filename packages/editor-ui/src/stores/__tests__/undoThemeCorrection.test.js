import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../queries/pageManager", () => ({
  getPage: vi.fn(),
  savePageContent: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../queries/previewManager", () => ({
  getGlobalWidgets: vi.fn(),
  saveGlobalWidget: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../queries/themeManager", () => ({
  getThemeSettings: vi.fn(),
  saveThemeSettingChanges: vi.fn(),
}));
vi.mock("../../queries/mediaManager", () => ({
  invalidateMediaCache: vi.fn(),
}));
vi.mock("../projectStore", () => ({
  default: { getState: () => ({ activeProject: { id: "test-project" } }) },
}));
vi.mock("../../lib/activeProjectId", () => ({
  getActiveProjectId: vi.fn(() => "test-project"),
}));

const { default: useAutoSave } = await import("../saveStore");
const { default: usePageStore } = await import("../pageStore");
const { default: useThemeStore } = await import("../themeStore");
const { getThemeSettings, saveThemeSettingChanges } = await import("../../queries/themeManager");

const clone = (value) => JSON.parse(JSON.stringify(value));

function themeWith({ color = "#ff0000", width = 1200, version } = {}) {
  return {
    ...(version ? { version } : {}),
    settings: {
      global: {
        colors: [{ id: "primary", type: "color", value: color }],
        layout: [{ id: "max_width", type: "range", value: width }],
      },
    },
  };
}

const page = {
  id: "page-1",
  title: "Test",
  widgets: { "w-1": { type: "rich-text", settings: { text: "Hi" } } },
  widgetsOrder: ["w-1"],
};

const temporal = () => usePageStore.temporal.getState();
const liveTheme = () => useThemeStore.getState().settings.settings.global;

function undo() {
  temporal().undo();
  usePageStore.getState().syncThemeStoreFromSnapshot();
  useAutoSave.getState().reconcileModifiedWidgets();
}

function editTheme(groupKey, settingId, value) {
  usePageStore.getState().updateThemeSetting(groupKey, settingId, value);
  useAutoSave.getState().setThemeSettingsModified(true);
}

describe("undo after a save the server corrected", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useAutoSave.getState().reset();
    useAutoSave.setState({ isSaving: false, isAutoSaving: false, runningSave: null, queuedFollowUp: null });

    useThemeStore.setState({ settings: themeWith(), originalSettings: themeWith(), loadedProjectId: "test-project" });
    usePageStore.setState({
      page: clone(page),
      originalPage: clone(page),
      globalWidgets: { header: null, footer: null },
      originalGlobalWidgets: { header: null, footer: null },
      themeSettingsSnapshot: themeWith(),
      loadedProjectId: "test-project",
      loading: false,
      error: null,
    });
    temporal().clear();
  });

  afterEach(() => {
    useAutoSave.getState().stopAutoSave();
    vi.useRealTimers();
  });

  it("does not bring a rejected theme value back when undoing a page edit, and keeps older valid values", async () => {
    editTheme("colors", "primary", "#00ff00");
    editTheme("layout", "max_width", 9999);
    usePageStore.getState().setPage({
      ...clone(page),
      widgets: { "w-1": { type: "rich-text", settings: { text: "Changed" } } },
    });
    useAutoSave.getState().markWidgetModified("w-1");

    saveThemeSettingChanges.mockResolvedValue({
      theme: themeWith({ color: "#00ff00", width: 1600 }),
      warnings: [{ code: "VALUE_CORRECTED", id: "max_width" }],
    });

    await useAutoSave.getState().save(false);

    expect(liveTheme().layout[0].value).toBe(1600);
    expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);

    undo();
    expect(usePageStore.getState().page.widgets["w-1"].settings.text).toBe("Hi");
    expect(liveTheme().layout[0].value).toBe(1600);
    expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);

    undo();
    expect(liveTheme().layout[0].value).toBe(1200);
    expect(liveTheme().colors[0].value).toBe("#00ff00");

    undo();
    expect(liveTheme().colors[0].value).toBe("#ff0000");
  });

  it("leaves history alone when the server accepted the theme as sent", async () => {
    editTheme("layout", "max_width", 1400);
    const entryBefore = temporal().pastStates[0];
    saveThemeSettingChanges.mockResolvedValue({ theme: themeWith({ width: 1400 }), warnings: [] });

    await useAutoSave.getState().save(false);

    expect(temporal().pastStates).toHaveLength(1);
    expect(temporal().pastStates[0]).toBe(entryBefore);
    expect(getThemeSettings).not.toHaveBeenCalled();

    undo();
    expect(liveTheme().layout[0].value).toBe(1200);
  });

  // Another screen changed the accent while this editor held the old one; the
  // conflict refetch takes it. Undoing an unrelated edit must not bring back the
  // accent this editor last saw.
  it("rebases history on another screen's change after a conflict", async () => {
    editTheme("layout", "max_width", 1400);
    saveThemeSettingChanges.mockRejectedValue(
      Object.assign(new Error("changed"), { status: 409, code: "THEME_SETTINGS_CHANGED", data: { conflicts: [] } }),
    );
    getThemeSettings.mockResolvedValue(themeWith({ color: "#0000ff" }));

    expect((await useAutoSave.getState().save(false)).status).toBe("conflict");
    expect(liveTheme().colors[0].value).toBe("#0000ff");
    expect(liveTheme().layout[0].value).toBe(1400);
    expect(useAutoSave.getState().themeConflict).not.toBeNull();

    undo();
    expect(liveTheme().layout[0].value).toBe(1200);
    expect(liveTheme().colors[0].value).toBe("#0000ff");
  });

  // Snapshots of an older theme structure must not come back through undo.
  it("clears history when the saved theme has a different version", async () => {
    useThemeStore.setState({ settings: themeWith({ version: "1.0.0" }), originalSettings: themeWith({ version: "1.0.0" }) });
    usePageStore.setState({ themeSettingsSnapshot: themeWith({ version: "1.0.0" }) });
    temporal().clear();
    editTheme("layout", "max_width", 1400);
    const saved = themeWith({ width: 1400, version: "1.1.0" });
    saveThemeSettingChanges.mockResolvedValue({ theme: saved, warnings: [] });

    await useAutoSave.getState().save(false);

    expect(temporal().pastStates).toHaveLength(0);
    expect(usePageStore.getState().themeSettingsSnapshot).toEqual(saved);
  });
});
