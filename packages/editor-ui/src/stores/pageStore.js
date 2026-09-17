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

const HISTORY_LIMIT = 150;
const COALESCE_WINDOW_MS = 500;

function changedLeafPaths(before, after, limit = Infinity, path = [], found = []) {
  if (found.length >= limit || Object.is(before, after)) return found;
  const comparable =
    before !== null &&
    after !== null &&
    typeof before === "object" &&
    typeof after === "object" &&
    Array.isArray(before) === Array.isArray(after) &&
    (!Array.isArray(before) || before.length === after.length);
  if (!comparable) {
    found.push(path);
    return found;
  }

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    changedLeafPaths(before[key], after[key], limit, [...path, key], found);
    if (found.length >= limit) break;
  }
  return found;
}

const valueAt = (source, path) => path.reduce((node, key) => node?.[key], source);

let lastEdit = null;

/**
 * Read a language's header/footer. Returns them rather than storing them: the
 * caller decides whether its load is still the current one before committing.
 */
async function readGlobalWidgets(language) {
  try {
    const data = await getGlobalWidgets(language);
    const shape = (type) =>
      data[type]
        ? {
            type,
            settings: data[type].settings || {},
            blocks: data[type].blocks || {},
            blocksOrder: data[type].blocksOrder || [],
          }
        : null;
    return { header: shape("header"), footer: shape("footer") };
  } catch (err) {
    console.error("Failed to load global widgets:", err);
    return { header: null, footer: null };
  }
}

const usePageStore = create(
  temporal(
    (set, get) => ({
      // State
      page: null,
      originalPage: null,
      globalWidgets: { header: null, footer: null },
      // Last-saved snapshot of globalWidgets, mirroring originalPage — lets
      // hasUnsavedChanges() detect a header/footer edit by VALUE, not just by
      // modifiedWidgets Set membership (a Set can't tell "still dirty from
      // before a save" apart from "re-dirtied by a fresh edit during that
      // save's in-flight window", since re-adding an id already present is a
      // no-op).
      originalGlobalWidgets: { header: null, footer: null },

      // Thin proxy snapshot — NOT the canonical copy. themeStore owns the truth.
      themeSettingsSnapshot: null,

      loadedProjectId: null,
      activeLoadId: 0,
      loading: true,
      error: null,

      // Actions
      loadPage: async (pageId, language) => {
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
            originalGlobalWidgets: { header: null, footer: null },
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
          originalGlobalWidgets: { header: null, footer: null },
          themeSettingsSnapshot: null,
        });

        try {
          // Load page data (clean, no global widgets mixed in)
          const pageData = await getPage(pageId, language);

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

          // In the language the page came back in — a default-language load passes
          // no argument but still has a folder. Held until the guard below, so a
          // superseded load cannot drop its header/footer on a newer page.
          const globalWidgets = await readGlobalWidgets(pageData.language);

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
            globalWidgets,
            originalGlobalWidgets: JSON.parse(JSON.stringify(globalWidgets)),
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
            originalGlobalWidgets: { header: null, footer: null },
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
          originalGlobalWidgets: { header: null, footer: null },
          themeSettingsSnapshot: null,
          loadedProjectId: null,
          loading: false,
          error: null,
        });
      },

      setOriginalPage: (page) => {
        set({ originalPage: JSON.parse(JSON.stringify(page)) });
      },

      // Rebaseline after a successful save, mirroring setOriginalPage — called
      // with the ENTRY-time globalWidgets snapshot save() actually sent (not
      // whatever the live state has become), so a further edit made while that
      // save's request was still in flight is correctly detected as a new
      // diff against this baseline.
      setOriginalGlobalWidgets: (globalWidgets) => {
        set({ originalGlobalWidgets: JSON.parse(JSON.stringify(globalWidgets)) });
      },

      /**
       * After the server corrected theme values on save, swap each rejected value
       * for its correction in every history entry that still holds it, so undoing
       * an unrelated edit can't restore it. Entries holding an older, valid value
       * keep it. The live snapshot is resynced from themeStore without a history step.
       */
      applyThemeCorrections: (sentSettings, savedSettings) => {
        const corrections = changedLeafPaths(sentSettings, savedSettings).filter((path) => path.length > 0);
        if (!corrections.length) return;

        const correct = (snapshot) => {
          let corrected = snapshot;
          for (const path of corrections) {
            if (!snapshot) break;
            if (JSON.stringify(valueAt(corrected, path)) !== JSON.stringify(valueAt(sentSettings, path))) continue;
            if (corrected === snapshot) corrected = JSON.parse(JSON.stringify(snapshot));
            const parent = valueAt(corrected, path.slice(0, -1));
            if (!parent || typeof parent !== "object") continue;
            const next = valueAt(savedSettings, path);
            if (next === undefined) delete parent[path.at(-1)];
            else parent[path.at(-1)] = JSON.parse(JSON.stringify(next));
          }
          return corrected;
        };
        const rewrite = (entries) =>
          entries.map((entry) => {
            const themeSettingsSnapshot = correct(entry.themeSettingsSnapshot);
            return themeSettingsSnapshot === entry.themeSettingsSnapshot ? entry : { ...entry, themeSettingsSnapshot };
          });

        const history = usePageStore.temporal.getState();
        usePageStore.temporal.setState({
          pastStates: rewrite(history.pastStates),
          futureStates: rewrite(history.futureStates),
        });

        const liveSettings = useThemeStore.getState().settings;
        history.pause();
        set({ themeSettingsSnapshot: liveSettings ? JSON.parse(JSON.stringify(liveSettings)) : null });
        history.resume();
      },
    }),
    {
      // zundo options
      limit: HISTORY_LIMIT,
      partialize: selectTemporalState,
      handleSet:
        (handleSet) =>
        (pastState, ...rest) => {
          const currentState = usePageStore.getState();
          if (currentState.page === null) return;

          const currentSnapshot = selectTemporalState(currentState);
          if (JSON.stringify(currentSnapshot) === JSON.stringify(pastState)) return;

          const changed = changedLeafPaths(pastState, currentSnapshot, 2);
          const path = changed.length === 1 ? JSON.stringify(changed[0]) : null;
          const now = Date.now();
          // Undo, redo and clear all change the last history entry, so an edit after any of them starts a new step.
          const lastEntry = usePageStore.temporal.getState().pastStates.at(-1);
          if (
            path &&
            lastEdit?.path === path &&
            lastEdit.entry === lastEntry &&
            now - lastEdit.at < COALESCE_WINDOW_MS
          ) {
            lastEdit.at = now;
            return;
          }

          handleSet(pastState, ...rest);
          lastEdit = path ? { path, at: now, entry: usePageStore.temporal.getState().pastStates.at(-1) } : null;
        },
    },
  ),
);

export default usePageStore;
