import { useEffect } from "react";
import { getActiveProjectId } from "../lib/activeProjectId.js";
import { getActiveProject } from "../queries/projectManager.js";
import useStaleProjectStore from "../stores/staleProjectStore.js";
import { subscribeActiveProjectChange } from "../lib/activeProjectChannel.js";

// Pure: the tab is stale when it holds an active project whose id differs from
// the server's current singleton active project. Absent client id or server
// project → not stale (avoid false curtains).
export function isActiveProjectStale(clientProjectId, serverProject) {
  return Boolean(clientProjectId) && Boolean(serverProject?.id) && serverProject.id !== clientProjectId;
}

// OSS single-tenant only. Meant to be mounted in the editor scope (so the curtain
// never blocks the picker/preview routes). On every focus/visibility regain, it
// re-probes the server's singleton active project and flips the shared flag —
// setting AND clearing, so re-activating this project elsewhere and returning
// auto-dismisses the curtain. No polling: a hidden tab stays stale until refocused
// (accepted per §29).
//
// NOTE: this hook's "stale" is client-active-project vs server; saveStore's 409
// branch (the other producer) marks stale on activeProject-vs-loadedProjectId. The
// two predicates differ, but that second state can't arise in normal OSS (an in-tab
// switch clears the loaded page via projectSwitchCoordinator), so they don't
// conflict in practice.
export function useStaleActiveProjectDetection() {
  useEffect(() => {
    let cancelled = false;
    let running = false; // dedupe the focus+visibilitychange double-fire; serialize probes
    const check = async () => {
      if (document.hidden || running) return;
      running = true;
      try {
        const serverProject = await getActiveProject();
        if (cancelled) return;
        const { markStale, clearStale } = useStaleProjectStore.getState();
        if (isActiveProjectStale(getActiveProjectId(), serverProject)) {
          markStale(serverProject?.name ?? null);
        } else {
          clearStale();
        }
      } catch {
        // transient probe failure — don't curtain on a network hiccup
      } finally {
        running = false;
      }
    };
    // Entering the editor loads the current singleton active project, so start from
    // a clean slate; the listeners below re-establish staleness on the next focus.
    useStaleProjectStore.getState().clearStale();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    // Same-browser fast path: a sibling tab that switches the active project
    // announces it, so a visible stale tab curtains at once without waiting for a
    // focus change (the check's document.hidden guard still defers a hidden tab).
    const unsubscribeChannel = subscribeActiveProjectChange(() => check());
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      unsubscribeChannel();
    };
  }, []);
}
