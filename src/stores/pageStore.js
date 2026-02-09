import { create } from "zustand";
import { temporal } from "zundo";
import { getPage } from "../queries/pageManager";
import { getGlobalWidgets } from "../queries/previewManager";
import { getThemeSettings } from "../queries/themeManager";

/**
 * Zustand store for managing page editor state with undo/redo support via zundo.
 * Handles page data, global widgets (header/footer), and theme settings.
 *
 * @typedef {Object} PageStore
 * @property {Object|null} page - The current page data being edited
 * @property {Object|null} originalPage - Deep copy of page at load time for change detection
 * @property {{header: Object|null, footer: Object|null}} globalWidgets - Global header and footer widget data
 * @property {Object|null} themeSettings - Current theme settings (tracked for undo)
 * @property {Object|null} originalThemeSettings - Deep copy of theme settings at load time
 * @property {boolean} loading - Whether page data is being loaded
 * @property {string|null} error - Error message if loading failed
 * @property {Function} loadPage - Load a page by ID, including global widgets and theme settings
 * @property {Function} loadThemeSettings - Load theme settings for undo tracking
 * @property {Function} updateThemeSetting - Update a single theme setting value
 * @property {Function} hasUnsavedThemeChanges - Check if theme settings differ from original
 * @property {Function} markThemeSettingsSaved - Update original theme settings after save
 * @property {Function} loadGlobalWidgets - Load header and footer widgets separately
 * @property {Function} setPage - Update the page state
 * @property {Function} updateGlobalWidget - Update a global widget's settings
 * @property {Function} resetPage - Revert page to original loaded state
 * @property {Function} clearPage - Reset all page state to initial values
 * @property {Function} setOriginalPage - Update the original page reference
 */

const selectTemporalState = (state) => ({
  page: state.page,
  globalWidgets: state.globalWidgets,
  themeSettings: state.themeSettings,
});

const usePageStore = create(
  temporal(
    (set, get) => ({
      // State
      page: null,
      originalPage: null,
      globalWidgets: { header: null, footer: null },
      themeSettings: null,
      originalThemeSettings: null,
      loading: true,
      error: null,

      // Actions
      loadPage: async (pageId) => {
        if (!pageId) {
          set({
            loading: false,
            error: null,
            page: null,
            originalPage: null,
            globalWidgets: { header: null, footer: null },
            themeSettings: null,
            originalThemeSettings: null,
          });
          return;
        }

        set({ loading: true, error: null });

        try {
          // Load page data (clean, no global widgets mixed in)
          const pageData = await getPage(pageId);

          // Filter out any header/footer widgets that might exist in page data
          // (defensive programming - they shouldn't be there, but just in case)
          const cleanWidgets = {};
          Object.entries(pageData.widgets).forEach(([id, widget]) => {
            if (widget.type !== "header" && widget.type !== "footer") {
              cleanWidgets[id] = widget;
            }
          });

          const cleanPageData = {
            ...pageData,
            widgets: cleanWidgets,
          };

          // Load global widgets separately
          await get().loadGlobalWidgets();

          // Load theme settings for undo tracking
          await get().loadThemeSettings();

          set({
            page: cleanPageData,
            originalPage: JSON.parse(JSON.stringify(cleanPageData)),
            loading: false,
            error: null,
          });

          // Clear undo history after page load - start fresh
          usePageStore.temporal.getState().clear();
        } catch (err) {
          set({ error: err.message, loading: false });
          console.error("Failed to load page:", err);
        }
      },

      // Load theme settings into pageStore for undo tracking
      loadThemeSettings: async () => {
        try {
          const settings = await getThemeSettings();
          set({
            themeSettings: settings,
            originalThemeSettings: JSON.parse(JSON.stringify(settings)),
          });
        } catch (err) {
          console.error("Failed to load theme settings:", err);
          set({ themeSettings: null, originalThemeSettings: null });
        }
      },

      // Update a single theme setting (tracked by undo)
      updateThemeSetting: (groupKey, settingId, value) => {
        const { themeSettings } = get();
        if (!themeSettings?.settings?.global) return;

        const updatedSettings = JSON.parse(JSON.stringify(themeSettings));
        const group = updatedSettings.settings.global[groupKey];

        if (!group) return;

        const settingIndex = group.findIndex((s) => s.id === settingId);
        if (settingIndex !== -1) {
          group[settingIndex].value = value;
        }

        set({ themeSettings: updatedSettings });
      },

      // Check if there are unsaved theme changes
      hasUnsavedThemeChanges: () => {
        const { themeSettings, originalThemeSettings } = get();
        if (!themeSettings || !originalThemeSettings) return false;
        return JSON.stringify(themeSettings) !== JSON.stringify(originalThemeSettings);
      },

      // Mark theme settings as saved (update original)
      markThemeSettingsSaved: () => {
        const { themeSettings } = get();
        if (themeSettings) {
          set({ originalThemeSettings: JSON.parse(JSON.stringify(themeSettings)) });
        }
      },

      // NEW: Load global widgets separately
      loadGlobalWidgets: async () => {
        try {
          const globalWidgetsData = await getGlobalWidgets();

          // Transform the data to include widget structure
          const globalWidgets = {
            header: globalWidgetsData.header
              ? {
                  type: "header",
                  settings: globalWidgetsData.header.settings || {},
                  blocks: globalWidgetsData.header.blocks || {},
                  blocksOrder: globalWidgetsData.header.blocksOrder || [],
                }
              : null,
            footer: globalWidgetsData.footer
              ? {
                  type: "footer",
                  settings: globalWidgetsData.footer.settings || {},
                  blocks: globalWidgetsData.footer.blocks || {},
                  blocksOrder: globalWidgetsData.footer.blocksOrder || [],
                }
              : null,
          };

          set({ globalWidgets });
        } catch (err) {
          console.error("Failed to load global widgets:", err);
          // Don't fail the entire page load if global widgets fail
          set({ globalWidgets: { header: null, footer: null } });
        }
      },

      setPage: (page) => {
        set({ page });
      },

      // NEW: Update global widget settings
      updateGlobalWidget: (widgetType, updates) => {
        const { globalWidgets } = get();
        if (widgetType !== "header" && widgetType !== "footer") return;

        const updatedGlobalWidgets = {
          ...globalWidgets,
          [widgetType]: globalWidgets[widgetType]
            ? {
                ...globalWidgets[widgetType],
                ...updates,
              }
            : null,
        };

        set({ globalWidgets: updatedGlobalWidgets });
      },

      resetPage: () => {
        const { originalPage } = get();
        if (originalPage) {
          set({ page: JSON.parse(JSON.stringify(originalPage)) });
        }
      },

      clearPage: () => {
        set({
          page: null,
          originalPage: null,
          globalWidgets: { header: null, footer: null },
          loading: false,
          error: null,
        });
      },

      setOriginalPage: (page) => {
        set({ originalPage: JSON.parse(JSON.stringify(page)) });
      },
    }),
    {
      // zundo options
      limit: 50, // Keep 50 undo states
      // Only track page content for undo, not loading/error states
      partialize: selectTemporalState,
      // Only track changes after page is loaded, skip initial load
      handleSet: (handleSet) => (state) => {
        // Get current state before the update
        const currentState = usePageStore.getState();
        // Only track if page was already loaded (not null)
        if (currentState.page === null) return;

        // Avoid creating no-op history entries
        const currentSnapshot = selectTemporalState(currentState);
        const nextSnapshot = selectTemporalState(state);
        if (JSON.stringify(currentSnapshot) === JSON.stringify(nextSnapshot)) return;

        handleSet(state);
      },
    },
  ),
);

export default usePageStore;
