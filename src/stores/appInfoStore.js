import { create } from "zustand";
import { apiFetch } from "../lib/apiFetch";

/**
 * Zustand store for app-level info (hosted mode, dashboard URL, etc.).
 * Fetched once on app startup from GET /api/core/info.
 */
const useAppInfoStore = create((set) => ({
  hostedMode: false,
  dashboardUrl: null,
  loaded: false,

  fetchAppInfo: async () => {
    try {
      const response = await apiFetch("/api/core/info");
      if (response.ok) {
        const data = await response.json();
        set({
          hostedMode: data.hostedMode,
          dashboardUrl: data.dashboardUrl,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      // Silently fail — default to open-source mode
      set({ loaded: true });
    }
  },
}));

export default useAppInfoStore;
