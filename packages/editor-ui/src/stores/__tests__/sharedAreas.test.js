import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../queries/pageManager", () => ({
  getPage: vi.fn(),
  savePageContent: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../queries/previewManager", () => ({
  getGlobalWidgets: vi.fn().mockResolvedValue({ header: null, footer: null }),
  saveGlobalWidget: vi.fn().mockResolvedValue({}),
  getProjectWidgets: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../queries/sharedAreaManager", () => ({
  getSharedAreas: vi.fn(),
  saveSharedArea: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));

const mockThemeStoreState = {
  settings: null,
  loadedProjectId: "test-project",
  hasUnsavedThemeChanges: vi.fn(() => false),
  loadSettings: vi.fn().mockResolvedValue(undefined),
  saveSettings: vi.fn().mockResolvedValue({}),
  discardDraft: vi.fn(),
};
vi.mock("../themeStore", () => ({ default: { getState: () => mockThemeStoreState } }));
vi.mock("../projectStore", () => ({
  default: { getState: () => ({ activeProject: { id: "test-project" } }) },
}));
vi.mock("../../lib/activeProjectId", () => ({ getActiveProjectId: vi.fn(() => "test-project") }));

const { default: useAutoSave } = await import("../saveStore");
const { default: usePageStore } = await import("../pageStore");
const { default: useWidgetStore, findWidgetOwner, areaModifiedKey } = await import("../widgetStore");
const { getPage, savePageContent } = await import("../../queries/pageManager");
const { getSharedAreas, saveSharedArea } = await import("../../queries/sharedAreaManager");

const clone = (value) => JSON.parse(JSON.stringify(value));

const AREA = {
  widgets: { a1: { type: "rich-text", settings: { heading: "Shared" }, blocks: {}, blocksOrder: [] } },
  widgetsOrder: ["a1"],
};

function seed({ area = AREA } = {}) {
  const page = {
    id: "about",
    language: "en",
    widgets: { p1: { type: "rich-text", settings: { heading: "Page" }, blocks: {}, blocksOrder: [] } },
    widgetsOrder: ["p1"],
  };
  usePageStore.setState({
    page: clone(page),
    originalPage: clone(page),
    globalWidgets: { header: null, footer: null },
    originalGlobalWidgets: { header: null, footer: null },
    declaredAreas: [{ id: "before_footer", label: "Before footer" }],
    retainedAreas: [],
    sharedAreas: { before_footer: clone(area) },
    originalSharedAreas: { before_footer: clone(area) },
    sharedAreasError: null,
    loadedProjectId: "test-project",
    loading: false,
  });
  usePageStore.temporal.getState().clear();
  useWidgetStore.setState({
    schemas: {
      "rich-text": { type: "rich-text", settings: [{ id: "heading", type: "text" }], blocks: [] },
      "core-form": { type: "core-form", settings: [], blocks: [] },
    },
    widgetClipboard: null,
    selectedWidgetId: null,
  });
}

const area = () => usePageStore.getState().sharedAreas.before_footer;
const page = () => usePageStore.getState().page;

beforeEach(() => {
  vi.clearAllMocks();
  useAutoSave.getState().reset();
  useAutoSave.setState({ isSaving: false, isAutoSaving: false, runningSave: null, queuedFollowUp: null });
  seed();
});

describe("editing a shared area", () => {
  it("finds a widget's owner by its id", () => {
    expect(findWidgetOwner("p1")).toEqual({ type: "page" });
    expect(findWidgetOwner("a1")).toEqual({ type: "area", areaId: "before_footer" });
    expect(findWidgetOwner("header")).toEqual({ type: "global" });
    expect(findWidgetOwner("ghost")).toBeNull();
  });

  it("adds to the area, not the page, and marks the area changed", () => {
    const id = useWidgetStore.getState().addWidget("rich-text", 1, "before_footer");
    expect(area().widgetsOrder).toEqual(["a1", id]);
    expect(page().widgetsOrder).toEqual(["p1"]);
    expect(useAutoSave.getState().modifiedWidgets.has(areaModifiedKey("before_footer"))).toBe(true);
    expect(useAutoSave.getState().structureModified).toBe(false);
  });

  it("refuses a form in an area, but not on the page", () => {
    expect(useWidgetStore.getState().addWidget("core-form", 0, "before_footer")).toBeNull();
    expect(area().widgetsOrder).toEqual(["a1"]);
    expect(useWidgetStore.getState().addWidget("core-form", 0)).not.toBeNull();
  });

  it("edits, duplicates, reorders and deletes area widgets in place", () => {
    const store = useWidgetStore.getState();
    store.updateWidgetSettingValues("a1", { heading: "Changed" });
    expect(area().widgets.a1.settings.heading).toBe("Changed");

    const copy = store.duplicateWidget("a1");
    expect(area().widgetsOrder).toEqual(["a1", copy]);

    store.reorderWidgets([copy, "a1"], "before_footer");
    expect(area().widgetsOrder).toEqual([copy, "a1"]);

    store.deleteWidget("a1");
    expect(area().widgetsOrder).toEqual([copy]);
    expect(page().widgetsOrder).toEqual(["p1"]);
  });

  it("copies between the page and an area as independent widgets without page-only roles", () => {
    const store = useWidgetStore.getState();
    store.updateWidgetSettingValues("p1", { listing_anchor: true, paginate: true });
    store.copyWidget("p1");
    const pasted = store.pasteWidget(0, "before_footer");

    expect(pasted).not.toBe("p1");
    expect(area().widgetsOrder[0]).toBe(pasted);
    expect(area().widgets[pasted].settings).toMatchObject({ listing_anchor: false, paginate: false });
    store.updateWidgetSettingValues(pasted, { heading: "Only in the area" });
    expect(page().widgets.p1.settings.heading).toBe("Page");

    store.copyWidget("a1");
    const back = store.pasteWidget(1);
    expect(page().widgetsOrder).toEqual(["p1", back]);
  });

  it("refuses to paste a form into an area", () => {
    const store = useWidgetStore.getState();
    store.addWidget("core-form", 0);
    store.copyWidget(page().widgetsOrder[0]);
    expect(store.pasteWidget(0, "before_footer")).toBeNull();
    expect(area().widgetsOrder).toEqual(["a1"]);
  });

  it("adds and edits blocks of an area widget in the area", () => {
    useWidgetStore.setState({
      schemas: {
        ...useWidgetStore.getState().schemas,
        "rich-text": { type: "rich-text", settings: [], blocks: [{ type: "item", settings: [{ id: "t", type: "text" }] }] },
      },
    });
    const blockId = useWidgetStore.getState().addBlock("a1", "item");
    useWidgetStore.getState().updateBlockSettings("a1", blockId, "t", "x");
    expect(area().widgets.a1.blocks[blockId].settings.t).toBe("x");
    expect(page().widgets.p1.blocks).toEqual({});
  });
});

describe("saving a shared area", () => {
  it("is unsaved after an area-only edit, and saves only that area", async () => {
    useWidgetStore.getState().updateWidgetSettingValues("a1", { heading: "Changed" });
    expect(useAutoSave.getState().hasUnsavedPageChanges()).toBe(true);

    const result = await useAutoSave.getState().save();
    expect(result.status).toBe("success");
    expect(saveSharedArea).toHaveBeenCalledTimes(1);
    expect(saveSharedArea.mock.calls[0][0]).toBe("before_footer");
    expect(saveSharedArea.mock.calls[0][2]).toBe("en");
    expect(savePageContent).not.toHaveBeenCalled();
    expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
  });

  it("keeps an area saved when the page's save fails, and the page unsaved", async () => {
    useWidgetStore.getState().updateWidgetSettingValues("a1", { heading: "Area edit" });
    // As the settings panel does for an area widget.
    useAutoSave.getState().markWidgetModified(areaModifiedKey("before_footer"));
    useWidgetStore.getState().updateWidgetSettingValues("p1", { heading: "Page edit" });
    useAutoSave.getState().setStructureModified(true);
    savePageContent.mockRejectedValueOnce(new Error("disk full"));

    await expect(useAutoSave.getState().save()).rejects.toThrow("disk full");

    const { sharedAreas, originalSharedAreas } = usePageStore.getState();
    expect(originalSharedAreas.before_footer).toEqual(sharedAreas.before_footer);
    expect(useAutoSave.getState().modifiedWidgets.has(areaModifiedKey("before_footer"))).toBe(false);
    expect(useAutoSave.getState().hasUnsavedPageChanges()).toBe(true);
  });

  it("keeps an area unsaved when its own save fails", async () => {
    useWidgetStore.getState().updateWidgetSettingValues("a1", { heading: "Changed" });
    saveSharedArea.mockRejectedValueOnce(new Error("offline"));

    await expect(useAutoSave.getState().save()).rejects.toThrow("offline");
    expect(usePageStore.getState().originalSharedAreas.before_footer.widgets.a1.settings.heading).toBe("Shared");
    expect(useAutoSave.getState().hasUnsavedPageChanges()).toBe(true);
  });

  it("keeps an edit made while the save was in flight unsaved", async () => {
    let finish;
    saveSharedArea.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    useWidgetStore.getState().updateWidgetSettingValues("a1", { heading: "First" });
    const saving = useAutoSave.getState().save();
    useWidgetStore.getState().updateWidgetSettingValues("a1", { heading: "Second" });
    finish({ success: true });
    await saving;

    expect(usePageStore.getState().originalSharedAreas.before_footer.widgets.a1.settings.heading).toBe("First");
    expect(useAutoSave.getState().hasUnsavedPageChanges()).toBe(true);
  });

  it("can undo a saved area edit, which makes it unsaved again", async () => {
    useWidgetStore.getState().updateWidgetSettingValues("a1", { heading: "Changed" });
    await useAutoSave.getState().save();
    expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);

    usePageStore.temporal.getState().undo();
    useAutoSave.getState().reconcileModifiedWidgets();

    expect(area().widgets.a1.settings.heading).toBe("Shared");
    expect(useAutoSave.getState().modifiedWidgets.has(areaModifiedKey("before_footer"))).toBe(true);
    expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
  });
});

describe("loading a page's shared areas", () => {
  beforeEach(() => {
    getPage.mockResolvedValue({ id: "about", language: "el", widgets: {}, widgetsOrder: [] });
  });

  it("loads the language's declared and retained areas with their saved copies", async () => {
    getSharedAreas.mockResolvedValue({
      declared: [{ id: "before_footer", label: "Before footer" }],
      retained: [{ id: "old_banner" }],
      areas: { before_footer: AREA, old_banner: { widgets: { x: { type: "rich-text" } }, widgetsOrder: ["x"] } },
    });
    await usePageStore.getState().loadPage("about", "el");

    const state = usePageStore.getState();
    expect(getSharedAreas).toHaveBeenCalledWith("el");
    expect(state.sharedAreas).toEqual({ before_footer: AREA });
    expect(state.originalSharedAreas).toEqual({ before_footer: AREA });
    expect(state.retainedAreas).toEqual([{ id: "old_banner", widgetCount: 1 }]);
    expect(useAutoSave.getState().hasUnsavedPageChanges()).toBe(false);
  });

  it("shows no areas, and so saves none, when they cannot be loaded", async () => {
    getSharedAreas.mockRejectedValue(new Error("unreadable"));
    await usePageStore.getState().loadPage("about", "el");

    const state = usePageStore.getState();
    expect(state.sharedAreas).toEqual({});
    expect(state.sharedAreasError).toBeTruthy();
    expect(state.page).not.toBeNull();
  });
});
