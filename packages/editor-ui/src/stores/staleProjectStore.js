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
  removedLanguage: null, // the language code, when known
  // A language warning is in force, even while a later "project" warning covers it
  // on screen (markStale leaves this and removedLanguage in place).
  languageRemoved: false,
  markStale: (incomingName = null) => set({ isStale: true, reason: "project", incomingName }),
  // A project warning already up keeps the screen: it is the blocking one, and the
  // language warning comes back when it clears (clearProjectMismatch).
  markLanguageRemoved: (removedLanguage = null) =>
    set((state) => ({
      isStale: true,
      reason: state.isStale && state.reason === "project" ? "project" : "language",
      removedLanguage,
      languageRemoved: true,
    })),
  clearStale: () =>
    set({ isStale: false, reason: null, incomingName: null, removedLanguage: null, languageRemoved: false }),
  // The tab is back on its own project. A project warning raised over a language
  // warning replaces it on screen, but the language is still gone and saving is
  // still suspended — so the language warning comes back rather than leaving the
  // editor looking fine while nothing saves.
  clearProjectMismatch: () =>
    set((state) =>
      state.languageRemoved
        ? { isStale: true, reason: "language", incomingName: null }
        : { isStale: false, reason: null, incomingName: null },
    ),
  // Clears ONLY a language warning, for the editing session that warning belongs to
  // ending. A project mismatch is about the tab, not the session, and outlives it —
  // clearing that here would drop a warning nothing else re-raises until the next
  // focus probe, leaving the tab quietly editing the wrong project. The language
  // behind a project warning does belong to the session, so it goes, and a later
  // clearProjectMismatch has nothing to bring back.
  clearLanguageRemoved: () =>
    set((state) =>
      state.reason === "language"
        ? { isStale: false, reason: null, incomingName: null, removedLanguage: null, languageRemoved: false }
        : { removedLanguage: null, languageRemoved: false },
    ),
}));

export default useStaleProjectStore;
