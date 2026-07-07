import { create } from "zustand";

// Shell-optional signal that the singleton active project changed under a tab
// (OSS single-active-project model). Producers: the OSS focus/visibility hook
// (useStaleActiveProjectDetection) and saveStore's write-guard 409 handler.
// Consumer: the OSS StaleProjectCurtain. Inert where nothing renders the curtain
// (e.g. hosted, which is per-request scoped and never goes stale this way).
const useStaleProjectStore = create((set) => ({
  isStale: false,
  incomingName: null, // server's current active project name, when known
  markStale: (incomingName = null) => set({ isStale: true, incomingName }),
  clearStale: () => set({ isStale: false, incomingName: null }),
}));

export default useStaleProjectStore;
