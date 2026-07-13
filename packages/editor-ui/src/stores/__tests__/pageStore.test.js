import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the async query modules BEFORE importing the store
vi.mock("../../queries/pageManager", () => ({
  getPage: vi.fn(),
}));
vi.mock("../../queries/previewManager", () => ({
  getGlobalWidgets: vi.fn(),
}));
vi.mock("../../queries/themeManager", () => ({
  getThemeSettings: vi.fn(),
}));
vi.mock("../../lib/activeProjectId", () => ({
  getActiveProjectId: vi.fn(() => "project-a"),
}));

// Mock themeStore — pageStore's updateThemeSetting proxy forwards to it
const mockThemeStoreState = {
  settings: null,
  originalSettings: null,
  loadSettings: vi.fn().mockResolvedValue(undefined),
  setSettings: vi.fn(),
  updateThemeSetting: vi.fn(),
  hasUnsavedThemeChanges: vi.fn(() => false),
  markThemeSettingsSaved: vi.fn(),
  resetForProjectChange: vi.fn(),
};

vi.mock("../themeStore", () => ({
  default: {
    getState: () => mockThemeStoreState,
  },
}));

const { default: usePageStore } = await import("../pageStore");
const { getPage } = await import("../../queries/pageManager");
const { getGlobalWidgets } = await import("../../queries/previewManager");
const { getActiveProjectId } = await import("../../lib/activeProjectId");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the store to its initial state before each test */
function resetStore() {
  usePageStore.setState({
    page: null,
    originalPage: null,
    globalWidgets: { header: null, footer: null },
    themeSettingsSnapshot: null,
    loadedProjectId: null,
    activeLoadId: 0,
    loading: true,
    error: null,
  });
}

/** Seed the store with typical page data */
function seedPage() {
  const page = {
    id: "page-1",
    title: "Test Page",
    widgets: {
      "w-1": { type: "rich-text", settings: { text: "Hello" }, blocks: {}, blocksOrder: [] },
    },
    widgetsOrder: ["w-1"],
  };

  usePageStore.setState({
    page: JSON.parse(JSON.stringify(page)),
    originalPage: JSON.parse(JSON.stringify(page)),
    loading: false,
    error: null,
  });

  return page;
}

/** Seed theme settings (via themeStore mock + pageStore snapshot) */
function seedThemeSettings() {
  const settings = {
    settings: {
      global: {
        colors: [
          { id: "primary_color", type: "color", value: "#ff0000" },
          { id: "secondary_color", type: "color", value: "#00ff00" },
        ],
        typography: [
          { id: "font_family", type: "select", value: "Inter" },
        ],
      },
    },
  };

  // Set up the themeStore mock with settings
  mockThemeStoreState.settings = JSON.parse(JSON.stringify(settings));
  mockThemeStoreState.originalSettings = JSON.parse(JSON.stringify(settings));

  // Also set the pageStore snapshot for undo tracking
  usePageStore.setState({
    themeSettingsSnapshot: JSON.parse(JSON.stringify(settings)),
  });

  return settings;
}

/** Seed global widgets */
function seedGlobalWidgets() {
  const globalWidgets = {
    header: {
      type: "header",
      settings: { logo: "logo.png", sticky: true },
      blocks: { "b-1": { type: "nav-link", settings: { label: "Home" } } },
      blocksOrder: ["b-1"],
    },
    footer: {
      type: "footer",
      settings: { copyright: "2024" },
      blocks: {},
      blocksOrder: [],
    },
  };

  usePageStore.setState({ globalWidgets });
  return globalWidgets;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

// ============================================================================
// Tests
// ============================================================================

describe("pageStore", () => {
  beforeEach(() => {
    getPage.mockReset();
    getGlobalWidgets.mockReset();
    getActiveProjectId.mockReset();
    getActiveProjectId.mockImplementation(() => "project-a");

    // Reset themeStore mock state
    mockThemeStoreState.settings = null;
    mockThemeStoreState.originalSettings = null;
    mockThemeStoreState.loadSettings.mockReset().mockResolvedValue(undefined);
    mockThemeStoreState.setSettings.mockReset();
    mockThemeStoreState.updateThemeSetting.mockReset();
    mockThemeStoreState.hasUnsavedThemeChanges.mockReset().mockReturnValue(false);
    mockThemeStoreState.markThemeSettingsSaved.mockReset();
    mockThemeStoreState.resetForProjectChange.mockReset();

    resetStore();
  });

  // --------------------------------------------------------------------------
  // setPage
  // --------------------------------------------------------------------------

  describe("setPage", () => {
    it("replaces the current page", () => {
      const newPage = { id: "p-2", title: "New", widgets: {}, widgetsOrder: [] };
      usePageStore.getState().setPage(newPage);
      expect(usePageStore.getState().page).toBe(newPage);
    });

    it("can set page to null", () => {
      seedPage();
      usePageStore.getState().setPage(null);
      expect(usePageStore.getState().page).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // updateThemeSetting (proxy)
  // --------------------------------------------------------------------------

  describe("updateThemeSetting", () => {
    it("forwards the mutation to themeStore and records a snapshot", () => {
      seedPage();
      seedThemeSettings();

      // After the proxy call, themeStore.updateThemeSetting should have been called
      // and themeStore.settings will reflect the update (via mock).
      const updatedSettings = JSON.parse(JSON.stringify(mockThemeStoreState.settings));
      updatedSettings.settings.global.colors[0].value = "#0000ff";
      mockThemeStoreState.settings = updatedSettings;

      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");

      expect(mockThemeStoreState.updateThemeSetting).toHaveBeenCalledWith("colors", "primary_color", "#0000ff");
      // The snapshot should reflect the updated themeStore settings
      expect(usePageStore.getState().themeSettingsSnapshot).toEqual(updatedSettings);
    });

    it("is a no-op when themeStore settings are null", () => {
      mockThemeStoreState.settings = null;
      expect(() => {
        usePageStore.getState().updateThemeSetting("colors", "primary_color", "#000");
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // syncThemeStoreFromSnapshot
  // --------------------------------------------------------------------------

  describe("syncThemeStoreFromSnapshot", () => {
    it("pushes snapshot to themeStore", () => {
      const snapshot = { settings: { global: { colors: [{ id: "c1", value: "#abc" }] } } };
      usePageStore.setState({ themeSettingsSnapshot: snapshot });

      usePageStore.getState().syncThemeStoreFromSnapshot();

      expect(mockThemeStoreState.setSettings).toHaveBeenCalled();
      const arg = mockThemeStoreState.setSettings.mock.calls[0][0];
      expect(arg).toEqual(snapshot);
      // Should be a deep copy, not the same reference
      expect(arg).not.toBe(snapshot);
    });

    it("is a no-op when snapshot is null", () => {
      usePageStore.setState({ themeSettingsSnapshot: null });
      usePageStore.getState().syncThemeStoreFromSnapshot();
      expect(mockThemeStoreState.setSettings).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // updateGlobalWidget
  // --------------------------------------------------------------------------

  describe("updateGlobalWidget", () => {
    it("merges updates into the header widget", () => {
      seedGlobalWidgets();
      usePageStore.getState().updateGlobalWidget("header", { settings: { logo: "new-logo.png" } });

      const header = usePageStore.getState().globalWidgets.header;
      expect(header.settings).toEqual({ logo: "new-logo.png" });
      expect(header.type).toBe("header"); // preserved
    });

    it("merges updates into the footer widget", () => {
      seedGlobalWidgets();
      usePageStore.getState().updateGlobalWidget("footer", { settings: { copyright: "2025" } });

      const footer = usePageStore.getState().globalWidgets.footer;
      expect(footer.settings).toEqual({ copyright: "2025" });
    });

    it("ignores invalid widget types", () => {
      seedGlobalWidgets();
      const before = JSON.stringify(usePageStore.getState().globalWidgets);
      usePageStore.getState().updateGlobalWidget("sidebar", { settings: {} });
      expect(JSON.stringify(usePageStore.getState().globalWidgets)).toBe(before);
    });

    it("does not create a widget when it is null", () => {
      // default: header and footer are null
      usePageStore.getState().updateGlobalWidget("header", { settings: { logo: "x" } });
      expect(usePageStore.getState().globalWidgets.header).toBeNull();
    });

    it("does not affect the other global widget", () => {
      seedGlobalWidgets();
      usePageStore.getState().updateGlobalWidget("header", { settings: { logo: "changed.png" } });

      // Footer should be unchanged
      expect(usePageStore.getState().globalWidgets.footer.settings.copyright).toBe("2024");
    });
  });

  // --------------------------------------------------------------------------
  // resetPage
  // --------------------------------------------------------------------------

  describe("resetPage", () => {
    it("reverts page to original state", () => {
      seedPage();

      // Mutate the current page
      const page = usePageStore.getState().page;
      page.title = "Changed";
      usePageStore.setState({ page: { ...page } });
      expect(usePageStore.getState().page.title).toBe("Changed");

      usePageStore.getState().resetPage();
      expect(usePageStore.getState().page.title).toBe("Test Page");
    });

    it("produces a deep copy (not the same reference as originalPage)", () => {
      seedPage();
      usePageStore.getState().resetPage();

      const page = usePageStore.getState().page;
      const original = usePageStore.getState().originalPage;
      expect(page).not.toBe(original);
      expect(page).toEqual(original);
    });

    it("is a no-op when originalPage is null", () => {
      usePageStore.setState({ page: { id: "x" }, originalPage: null });
      usePageStore.getState().resetPage();
      expect(usePageStore.getState().page).toEqual({ id: "x" });
    });
  });

  // --------------------------------------------------------------------------
  // clearPage
  // --------------------------------------------------------------------------

  describe("clearPage", () => {
    it("resets all page state to initial values", () => {
      seedPage();
      seedGlobalWidgets();
      seedThemeSettings();
      usePageStore.setState({ loadedProjectId: "project-a" });
      usePageStore.getState().clearPage();

      const state = usePageStore.getState();
      expect(state.page).toBeNull();
      expect(state.originalPage).toBeNull();
      expect(state.globalWidgets).toEqual({ header: null, footer: null });
      expect(state.themeSettingsSnapshot).toBeNull();
      expect(state.loadedProjectId).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("loadPage", () => {
    it("loads page and globals, delegates theme loading to themeStore", async () => {
      getPage.mockResolvedValue({
        id: "page-1",
        title: "Loaded Page",
        widgets: {
          "w-1": { type: "text", settings: { label: "Hello" } },
          "w-global": { type: "header", settings: {} },
        },
        widgetsOrder: ["w-1", "w-global"],
      });
      getGlobalWidgets.mockResolvedValue({
        header: { settings: { logo: "logo.png" }, blocks: {}, blocksOrder: [] },
        footer: null,
      });

      // After loadSettings, themeStore will have settings
      const themeData = {
        settings: { global: { colors: [{ id: "primary", value: "#000" }] } },
      };
      mockThemeStoreState.loadSettings.mockImplementation(async () => {
        mockThemeStoreState.settings = themeData;
      });

      await usePageStore.getState().loadPage("page-1");

      const state = usePageStore.getState();
      expect(getGlobalWidgets).toHaveBeenCalled();
      expect(mockThemeStoreState.loadSettings).toHaveBeenCalledWith("project-a");
      expect(state.loadedProjectId).toBe("project-a");
      expect(Object.keys(state.page.widgets)).toEqual(["w-1"]);
      expect(state.globalWidgets.header.type).toBe("header");
      // The snapshot should reflect what themeStore loaded
      expect(state.themeSettingsSnapshot).toEqual(themeData);
    });

    it("clears stale state when the load fails", async () => {
      seedPage();
      seedGlobalWidgets();
      seedThemeSettings();
      getPage.mockRejectedValue(new Error("boom"));
      getActiveProjectId.mockReturnValue("project-b");

      await usePageStore.getState().loadPage("page-1");

      const state = usePageStore.getState();
      expect(state.page).toBeNull();
      expect(state.globalWidgets).toEqual({ header: null, footer: null });
      expect(state.themeSettingsSnapshot).toBeNull();
      expect(state.loadedProjectId).toBe("project-b");
      expect(state.error).toBe("boom");
    });

    it("clears previous page state immediately when a new load starts", async () => {
      seedPage();
      seedGlobalWidgets();
      seedThemeSettings();

      const pageRequest = createDeferred();
      getPage.mockReturnValue(pageRequest.promise);
      getGlobalWidgets.mockResolvedValue({ header: null, footer: null });

      const loadPromise = usePageStore.getState().loadPage("page-2");

      const interimState = usePageStore.getState();
      expect(interimState.loading).toBe(true);
      expect(interimState.error).toBeNull();
      expect(interimState.page).toBeNull();
      expect(interimState.originalPage).toBeNull();
      expect(interimState.globalWidgets).toEqual({ header: null, footer: null });
      expect(interimState.themeSettingsSnapshot).toBeNull();
      expect(interimState.loadedProjectId).toBe("project-a");

      pageRequest.resolve({
        id: "page-2",
        title: "Fresh Page",
        widgets: {},
        widgetsOrder: [],
      });

      await loadPromise;
    });

    it("keeps the most recent load result when an earlier load resolves later", async () => {
      const firstPageRequest = createDeferred();
      const secondPageRequest = createDeferred();

      getPage
        .mockImplementationOnce(() => firstPageRequest.promise)
        .mockImplementationOnce(() => secondPageRequest.promise);
      getGlobalWidgets.mockResolvedValue({ header: null, footer: null });
      getActiveProjectId
        .mockImplementationOnce(() => "project-a")
        .mockImplementationOnce(() => "project-b")
        .mockImplementation(() => "project-b");

      const firstLoadPromise = usePageStore.getState().loadPage("page-a");
      const secondLoadPromise = usePageStore.getState().loadPage("page-b");

      secondPageRequest.resolve({
        id: "page-b",
        title: "Page B",
        widgets: {},
        widgetsOrder: [],
      });
      await secondLoadPromise;

      firstPageRequest.resolve({
        id: "page-a",
        title: "Page A",
        widgets: {},
        widgetsOrder: [],
      });
      await firstLoadPromise;

      const state = usePageStore.getState();
      expect(state.loadedProjectId).toBe("project-b");
      expect(state.page.id).toBe("page-b");
      expect(state.page.title).toBe("Page B");
    });

    it("preserves an unsaved theme draft when themeStore already has data for the same project", async () => {
      // Simulate: user edited theme settings on Settings page for project-a,
      // then navigated to the editor for the same project.
      const draftSettings = {
        settings: { global: { colors: [{ id: "primary", value: "#draft" }] } },
      };
      mockThemeStoreState.settings = draftSettings;
      mockThemeStoreState.loadedProjectId = "project-a";

      getPage.mockResolvedValue({
        id: "page-1",
        title: "Page",
        widgets: {},
        widgetsOrder: [],
      });
      getGlobalWidgets.mockResolvedValue({ header: null, footer: null });

      await usePageStore.getState().loadPage("page-1");

      // themeStore.loadSettings should NOT have been called — draft preserved
      expect(mockThemeStoreState.loadSettings).not.toHaveBeenCalled();
      // The snapshot should reflect the existing draft
      expect(usePageStore.getState().themeSettingsSnapshot).toEqual(draftSettings);
    });

    it("retries theme load for the same project after a previous failure", async () => {
      // Simulate: a previous load for project-a failed, leaving loadedProjectId
      // set but settings null. The next loadPage for the same project must retry.
      mockThemeStoreState.settings = null;
      mockThemeStoreState.loadedProjectId = "project-a";

      const freshTheme = {
        settings: { global: { colors: [{ id: "primary", value: "#retried" }] } },
      };
      mockThemeStoreState.loadSettings.mockImplementation(async () => {
        mockThemeStoreState.settings = freshTheme;
      });

      getPage.mockResolvedValue({
        id: "page-1",
        title: "Page",
        widgets: {},
        widgetsOrder: [],
      });
      getGlobalWidgets.mockResolvedValue({ header: null, footer: null });

      await usePageStore.getState().loadPage("page-1");

      // Must have retried since settings was null
      expect(mockThemeStoreState.loadSettings).toHaveBeenCalledWith("project-a");
      expect(usePageStore.getState().themeSettingsSnapshot).toEqual(freshTheme);
    });

    it("refetches theme settings when themeStore has data for a different project", async () => {
      // themeStore has data for project-a, but we're loading a page for project-b
      mockThemeStoreState.settings = { settings: { global: {} } };
      mockThemeStoreState.loadedProjectId = "project-a";

      getActiveProjectId.mockReturnValue("project-b");
      getPage.mockResolvedValue({
        id: "page-1",
        title: "Page",
        widgets: {},
        widgetsOrder: [],
      });
      getGlobalWidgets.mockResolvedValue({ header: null, footer: null });
      const freshTheme = {
        settings: { global: { colors: [{ id: "primary", value: "#fresh" }] } },
      };
      mockThemeStoreState.loadSettings.mockImplementation(async () => {
        mockThemeStoreState.settings = freshTheme;
        mockThemeStoreState.loadedProjectId = "project-b";
      });

      await usePageStore.getState().loadPage("page-1");

      expect(mockThemeStoreState.loadSettings).toHaveBeenCalledWith("project-b");
      expect(usePageStore.getState().themeSettingsSnapshot).toEqual(freshTheme);
    });
  });

  // --------------------------------------------------------------------------
  // setOriginalPage
  // --------------------------------------------------------------------------

  describe("setOriginalPage", () => {
    it("stores a deep copy of the provided page", () => {
      const page = { id: "p-1", title: "Original", widgets: {}, widgetsOrder: [] };
      usePageStore.getState().setOriginalPage(page);

      const stored = usePageStore.getState().originalPage;
      expect(stored).toEqual(page);
      expect(stored).not.toBe(page); // deep copy
    });

    it("stored copy is independent of the source object", () => {
      const page = { id: "p-1", title: "Original", widgets: {}, widgetsOrder: [] };
      usePageStore.getState().setOriginalPage(page);

      page.title = "Mutated";
      expect(usePageStore.getState().originalPage.title).toBe("Original");
    });
  });
});
