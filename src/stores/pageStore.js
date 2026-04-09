import { create } from "zustand";
import { temporal } from "zundo";
import { getPage } from "../queries/pageManager";
import { getGlobalWidgets } from "../queries/previewManager";
import { getActiveProjectId } from "../lib/activeProjectId";
import useThemeStore from "./themeStore";

/**
 * Zustand store for managing page editor state with undo/redo support via zundo.
 * Handles page data, global widgets (header/footer), and a thin theme-settings
 * proxy so editor theme edits participate in the unified undo stack.
 *
 * Theme settings ownership lives in themeStore. This store keeps a snapshot
 * (`themeSettingsSnapshot`) solely for zundo history. Mutations are forwarded
 * to themeStore; undo/redo restores push the snapshot back into themeStore.
 */

const selectTemporalState = (state) => ({
  page: state.page,
  globalWidgets: state.globalWidgets,
  themeSettingsSnapshot: state.themeSettingsSnapshot,
});

const usePageStore = create(
  temporal(
    (set, get) => ({
      // State
      page: null,
      originalPage: null,
      globalWidgets: { header: null, footer: null },

      // Thin proxy snapshot — NOT the canonical copy. themeStore owns the truth.
      themeSettingsSnapshot: null,

      loadedProjectId: null,
      activeLoadId: 0,
      loading: true,
      error: null,

      // Actions
      loadPage: async (pageId) => {
        const projectId = getActiveProjectId();
        const nextLoadId = get().activeLoadId + 1;
        set({ activeLoadId: nextLoadId });

        if (!pageId) {
          set({
            loading: false,
            error: null,
            page: null,
            originalPage: null,
            globalWidgets: { header: null, footer: null },
            themeSettingsSnapshot: null,
            loadedProjectId: projectId,
          });
          return;
        }

        set({
          loading: true,
          error: null,
          loadedProjectId: projectId,
          page: null,
          originalPage: null,
          globalWidgets: { header: null, footer: null },
          themeSettingsSnapshot: null,
        });

        try {
          // Load page data (clean, no global widgets mixed in)
          const pageData = await getPage(pageId);

          // Filter out any header/footer widgets that might exist in page data
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

          // Load theme settings into themeStore (canonical owner).
          // Skip refetch only if themeStore already holds *valid* data for this
          // project — this preserves any unsaved draft from the Settings page.
          // A previous failed load sets loadedProjectId but leaves settings null,
          // so we must check both to allow retries after transient failures.
          const themeState = useThemeStore.getState();
          if (themeState.loadedProjectId !== projectId || themeState.settings === null) {
            await useThemeStore.getState().loadSettings(projectId);
          }

          if (get().activeLoadId !== nextLoadId) {
            return;
          }

          // Take an initial snapshot for undo tracking
          const themeSnapshot = useThemeStore.getState().settings;

          set({
            page: cleanPageData,
            originalPage: JSON.parse(JSON.stringify(cleanPageData)),
            themeSettingsSnapshot: themeSnapshot ? JSON.parse(JSON.stringify(themeSnapshot)) : null,
            loading: false,
            error: null,
            loadedProjectId: projectId,
          });

          // Clear undo history after page load - start fresh
          usePageStore.temporal.getState().clear();
        } catch (err) {
          if (get().activeLoadId !== nextLoadId) {
            return;
          }
          set({
            error: err.message,
            loading: false,
            page: null,
            originalPage: null,
            globalWidgets: { header: null, footer: null },
            themeSettingsSnapshot: null,
            loadedProjectId: projectId,
          });
          console.error("Failed to load page:", err);
        }
      },

      /**
       * Proxy: update a single theme setting.
       * Forwards the mutation to themeStore (canonical) and records a snapshot
       * in this store so zundo can undo/redo it.
       */
      updateThemeSetting: (groupKey, settingId, value) => {
        // Forward to canonical owner
        useThemeStore.getState().updateThemeSetting(groupKey, settingId, value);
        // Record snapshot for undo
        const updatedSettings = useThemeStore.getState().settings;
        set({
          themeSettingsSnapshot: updatedSettings ? JSON.parse(JSON.stringify(updatedSettings)) : null,
        });
      },

      /**
       * Sync themeStore from the current snapshot.
       * Called after undo/redo to push the restored snapshot back to themeStore.
       */
      syncThemeStoreFromSnapshot: () => {
        const { themeSettingsSnapshot } = get();
        if (themeSettingsSnapshot) {
          useThemeStore.getState().setSettings(JSON.parse(JSON.stringify(themeSettingsSnapshot)));
        }
      },

      // Load global widgets separately
      loadGlobalWidgets: async () => {
        try {
          const globalWidgetsData = await getGlobalWidgets();

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
          set({ globalWidgets: { header: null, footer: null } });
        }
      },

      setPage: (page) => {
        set({ page });
      },

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
          themeSettingsSnapshot: null,
          loadedProjectId: null,
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
      limit: 50,
      partialize: selectTemporalState,
      handleSet: (handleSet) => (state) => {
        const currentState = usePageStore.getState();
        if (currentState.page === null) return;

        const currentSnapshot = selectTemporalState(currentState);
        const nextSnapshot = selectTemporalState(state);
        if (JSON.stringify(currentSnapshot) === JSON.stringify(nextSnapshot)) return;

        handleSet(state);
      },
    },
  ),
);

export default usePageStore;
