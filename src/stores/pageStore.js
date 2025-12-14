import { create } from "zustand";
import { temporal } from "zundo";
import { getPage } from "../queries/pageManager";
import { getGlobalWidgets } from "../queries/previewManager";

const usePageStore = create(
  temporal(
    (set, get) => ({
      // State
      page: null,
      originalPage: null,
      globalWidgets: { header: null, footer: null },
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
      partialize: (state) => ({
        // Only track page content for undo, not loading/error states
        page: state.page,
        globalWidgets: state.globalWidgets,
      }),
      // Only track changes after page is loaded, skip initial load
      handleSet: (handleSet) => (state) => {
        // Get current state before the update
        const currentState = usePageStore.getState();
        // Only track if page was already loaded (not null)
        if (currentState.page !== null) {
          handleSet(state);
        }
      },
    }
  )
);

export default usePageStore;
