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

const { default: usePageStore } = await import("../pageStore");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the store to its initial state before each test */
function resetStore() {
  usePageStore.setState({
    page: null,
    originalPage: null,
    globalWidgets: { header: null, footer: null },
    themeSettings: null,
    originalThemeSettings: null,
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

/** Seed theme settings */
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

  usePageStore.setState({
    themeSettings: JSON.parse(JSON.stringify(settings)),
    originalThemeSettings: JSON.parse(JSON.stringify(settings)),
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

// ============================================================================
// Tests
// ============================================================================

describe("pageStore", () => {
  beforeEach(() => {
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
  // updateThemeSetting
  // --------------------------------------------------------------------------

  describe("updateThemeSetting", () => {
    it("updates a setting value within a group", () => {
      seedThemeSettings();
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");

      const colors = usePageStore.getState().themeSettings.settings.global.colors;
      const primary = colors.find((s) => s.id === "primary_color");
      expect(primary.value).toBe("#0000ff");
    });

    it("does not affect other settings in the same group", () => {
      seedThemeSettings();
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");

      const colors = usePageStore.getState().themeSettings.settings.global.colors;
      const secondary = colors.find((s) => s.id === "secondary_color");
      expect(secondary.value).toBe("#00ff00");
    });

    it("does not affect other groups", () => {
      seedThemeSettings();
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");

      const typography = usePageStore.getState().themeSettings.settings.global.typography;
      expect(typography[0].value).toBe("Inter");
    });

    it("is a no-op for a non-existent group", () => {
      seedThemeSettings();
      const before = JSON.stringify(usePageStore.getState().themeSettings);
      usePageStore.getState().updateThemeSetting("nonexistent", "foo", "bar");
      expect(JSON.stringify(usePageStore.getState().themeSettings)).toBe(before);
    });

    it("is a no-op for a non-existent setting ID within a valid group", () => {
      seedThemeSettings();
      usePageStore.getState().updateThemeSetting("colors", "nonexistent", "#aaa");

      // The existing settings should be unchanged
      const colors = usePageStore.getState().themeSettings.settings.global.colors;
      expect(colors.find((s) => s.id === "primary_color").value).toBe("#ff0000");
    });

    it("is a no-op when themeSettings is null", () => {
      // Store starts with themeSettings: null — should not throw
      expect(() => {
        usePageStore.getState().updateThemeSetting("colors", "primary_color", "#000");
      }).not.toThrow();
    });

    it("produces a deep copy (does not mutate original)", () => {
      seedThemeSettings();
      const before = usePageStore.getState().originalThemeSettings;
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");

      const originalPrimary = before.settings.global.colors.find((s) => s.id === "primary_color");
      expect(originalPrimary.value).toBe("#ff0000");
    });
  });

  // --------------------------------------------------------------------------
  // hasUnsavedThemeChanges
  // --------------------------------------------------------------------------

  describe("hasUnsavedThemeChanges", () => {
    it("returns false when theme settings match original", () => {
      seedThemeSettings();
      expect(usePageStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });

    it("returns true after a theme setting is changed", () => {
      seedThemeSettings();
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#changed");
      expect(usePageStore.getState().hasUnsavedThemeChanges()).toBe(true);
    });

    it("returns false when themeSettings is null", () => {
      expect(usePageStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });

    it("returns false when originalThemeSettings is null", () => {
      usePageStore.setState({ themeSettings: { settings: {} }, originalThemeSettings: null });
      expect(usePageStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // markThemeSettingsSaved
  // --------------------------------------------------------------------------

  describe("markThemeSettingsSaved", () => {
    it("syncs originalThemeSettings to current themeSettings", () => {
      seedThemeSettings();
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#saved");
      expect(usePageStore.getState().hasUnsavedThemeChanges()).toBe(true);

      usePageStore.getState().markThemeSettingsSaved();
      expect(usePageStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });

    it("creates a deep copy so future edits do not affect original", () => {
      seedThemeSettings();
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#saved");
      usePageStore.getState().markThemeSettingsSaved();

      // Now change again — should show unsaved
      usePageStore.getState().updateThemeSetting("colors", "primary_color", "#changed-again");
      expect(usePageStore.getState().hasUnsavedThemeChanges()).toBe(true);
    });

    it("is a no-op when themeSettings is null", () => {
      expect(() => usePageStore.getState().markThemeSettingsSaved()).not.toThrow();
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
      usePageStore.getState().clearPage();

      const state = usePageStore.getState();
      expect(state.page).toBeNull();
      expect(state.originalPage).toBeNull();
      expect(state.globalWidgets).toEqual({ header: null, footer: null });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
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
