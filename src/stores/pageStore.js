import { create } from "zustand";
import { getPage } from "../utils/pageManager";
import { getGlobalWidgets } from "../utils/previewManager";

const usePageStore = create((set, get) => ({
  // State
  page: null,
  originalPage: null,
  loading: true,
  error: null,

  // Actions
  loadPage: async (pageId) => {
    if (!pageId) {
      set({ loading: false, error: null, page: null, originalPage: null });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Load page data
      const pageData = await getPage(pageId);

      // Load global widgets
      const globalWidgets = await getGlobalWidgets();

      // Generate IDs for global widgets
      const headerWidgetId = "header_widget";
      const footerWidgetId = "footer_widget";

      // Create a new ordered widgets object starting with header
      const enhancedWidgets = {};

      // Always add header widget first
      enhancedWidgets[headerWidgetId] = {
        type: "header",
        settings: globalWidgets.header?.settings || {},
      };

      // Add all regular page widgets in the middle
      Object.entries(pageData.widgets).forEach(([id, widget]) => {
        if (widget.type !== "header" && widget.type !== "footer") {
          enhancedWidgets[id] = widget;
        }
      });

      // Always add footer widget last
      enhancedWidgets[footerWidgetId] = {
        type: "footer",
        settings: globalWidgets.footer?.settings || {},
      };

      // Update page data with enhanced widgets
      const enhancedPageData = {
        ...pageData,
        widgets: enhancedWidgets,
      };

      set({
        page: enhancedPageData,
        originalPage: JSON.parse(JSON.stringify(enhancedPageData)),
        loading: false,
        error: null,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      console.error("Failed to load page:", err);
    }
  },

  setPage: (page) => {
    set({ page });
  },

  resetPage: () => {
    const { originalPage } = get();
    if (originalPage) {
      set({ page: JSON.parse(JSON.stringify(originalPage)) });
    }
  },

  clearPage: () => {
    set({ page: null, originalPage: null, loading: false, error: null });
  },

  setOriginalPage: (page) => {
    set({ originalPage: JSON.parse(JSON.stringify(page)) });
  },
}));

export default usePageStore;
