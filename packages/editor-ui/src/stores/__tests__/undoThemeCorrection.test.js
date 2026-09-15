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
  saveThemeSettings: vi.fn(),
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
const { getThemeSettings, saveThemeSettings } = await import("../../queries/themeManager");

const clone = (value) => JSON.parse(JSON.stringify(value));

function themeWith({ color = "#ff0000", width = 1200 } = {}) {
  return {
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

    saveThemeSettings.mockResolvedValue({ warnings: ["max_width was out of range"] });
    getThemeSettings.mockResolvedValue(themeWith({ color: "#00ff00", width: 1600 }));

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
    saveThemeSettings.mockResolvedValue({});

    await useAutoSave.getState().save(false);

    expect(temporal().pastStates).toHaveLength(1);
    expect(temporal().pastStates[0]).toBe(entryBefore);
    expect(getThemeSettings).not.toHaveBeenCalled();

    undo();
    expect(liveTheme().layout[0].value).toBe(1200);
  });
});
