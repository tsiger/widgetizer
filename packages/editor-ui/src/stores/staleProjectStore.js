import { create } from "zustand";

// Shell-optional signal that this tab's view is out of date and cannot save.
// Producers: the OSS focus/visibility hook (useStaleActiveProjectDetection) and
// saveStore's 409 handlers. Consumer: the OSS StaleProjectCurtain. Inert where
// nothing renders the curtain (e.g. hosted, which is per-request scoped).
//
// Two reasons, deliberately sharing one mechanism because the user's situation is
// the same — the work is still here, it cannot be saved, and recovery is a reload —
// but they do NOT recover the same way:
//
//   "project"  the singleton active project changed under this tab. Reversible:
//              re-activating this project elsewhere clears it, and the focus
//              revalidation does that automatically.
//   "language" the language being edited was removed from the site. Not reversible
//              and never auto-clears: there is nowhere left to save this work, so
//              reloading means losing it. The curtain has to say so.
const useStaleProjectStore = create((set) => ({
  isStale: false,
  reason: null, // "project" | "language"
  incomingName: null, // server's current active project name, when known
  removedLanguage: null, // the language code, when reason is "language"
  markStale: (incomingName = null) => set({ isStale: true, reason: "project", incomingName }),
  markLanguageRemoved: (removedLanguage = null) =>
    set({ isStale: true, reason: "language", removedLanguage }),
  clearStale: () => set({ isStale: false, reason: null, incomingName: null, removedLanguage: null }),
  // Clears ONLY a language warning, for the editing session that warning belongs to
  // ending. A project mismatch is about the tab, not the session, and outlives it —
  // clearing that here would drop a warning nothing else re-raises until the next
  // focus probe, leaving the tab quietly editing the wrong project.
  clearLanguageRemoved: () =>
    set((state) =>
      state.reason === "language"
        ? { isStale: false, reason: null, incomingName: null, removedLanguage: null }
        : {},
    ),
}));

export default useStaleProjectStore;
