import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bug, ChevronLeft, ChevronRight, Copy } from "lucide-react";

import useProjectStore from "../../stores/projectStore";
import usePageStore from "../../stores/pageStore";
import useThemeStore from "../../stores/themeStore";
import useWidgetStore from "../../stores/widgetStore";
import useAutoSave from "../../stores/saveStore";
import useToastStore from "../../stores/toastStore";

const PANEL_STORAGE_KEY = "widgetizer:debug-panel-open";
const MAX_EVENTS = 60;
const DEBUG_STATE_ENABLED = import.meta.env.VITE_DEBUG_STATE === "true";

function readStoredOpenState() {
  if (typeof window === "undefined") return true;
  const value = window.localStorage.getItem(PANEL_STORAGE_KEY);
  if (value === null) return true;
  return value === "true";
}

function sanitizeValue(value, depth = 0) {
  if (depth > 6) return "[Max depth]";
  if (value instanceof Set) return Array.from(value);
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "function") return undefined;
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue, depth + 1)])
      .filter(([, nestedValue]) => nestedValue !== undefined),
  );
}

function formatEventPayload(payload) {
  if (!payload) return "";
  const text = JSON.stringify(payload);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function pushEvent(setEvents, type, payload) {
  setEvents((current) => [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toLocaleTimeString(),
      type,
      payload,
    },
    ...current,
  ].slice(0, MAX_EVENTS));
}

function useDebugEventLog(location) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    pushEvent(setEvents, "route", {
      pathname: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);

  useEffect(
    () => useProjectStore.subscribe((state, prev) => {
      if (state.activeProject?.id !== prev.activeProject?.id) {
        pushEvent(setEvents, "project.switch", {
          from: prev.activeProject?.id ?? null,
          to: state.activeProject?.id ?? null,
        });
      }
    }),
    [],
  );

  useEffect(
    () => usePageStore.subscribe((state, prev) => {
      if (state.loading !== prev.loading) {
        pushEvent(setEvents, "page.loading", {
          loading: state.loading,
          loadedProjectId: state.loadedProjectId,
          pageId: state.page?.id ?? null,
        });
      }

      if (state.page?.id !== prev.page?.id) {
        pushEvent(setEvents, "page.loaded", {
          from: prev.page?.id ?? null,
          to: state.page?.id ?? null,
          loadedProjectId: state.loadedProjectId,
        });
      }

      if (state.error !== prev.error && state.error) {
        pushEvent(setEvents, "page.error", {
          error: state.error,
          loadedProjectId: state.loadedProjectId,
        });
      }
    }),
    [],
  );

  useEffect(
    () => useThemeStore.subscribe((state, prev) => {
      if (state.loading !== prev.loading) {
        pushEvent(setEvents, "theme.loading", {
          loading: state.loading,
          loadedProjectId: state.loadedProjectId,
        });
      }

      if (state.loadedProjectId !== prev.loadedProjectId) {
        pushEvent(setEvents, "theme.project", {
          from: prev.loadedProjectId ?? null,
          to: state.loadedProjectId ?? null,
        });
      }

      if (state.error !== prev.error && state.error) {
        pushEvent(setEvents, "theme.error", {
          error: state.error,
          loadedProjectId: state.loadedProjectId,
        });
      }
    }),
    [],
  );

  useEffect(
    () => useWidgetStore.subscribe((state, prev) => {
      if (
        state.selectedWidgetId !== prev.selectedWidgetId
        || state.selectedBlockId !== prev.selectedBlockId
        || state.selectedGlobalWidgetId !== prev.selectedGlobalWidgetId
        || state.selectedThemeGroup !== prev.selectedThemeGroup
      ) {
        pushEvent(setEvents, "widget.selection", {
          selectedWidgetId: state.selectedWidgetId,
          selectedBlockId: state.selectedBlockId,
          selectedGlobalWidgetId: state.selectedGlobalWidgetId,
          selectedThemeGroup: state.selectedThemeGroup,
        });
      }
    }),
    [],
  );

  useEffect(
    () => useAutoSave.subscribe((state, prev) => {
      if (state.isSaving !== prev.isSaving || state.isAutoSaving !== prev.isAutoSaving) {
        pushEvent(setEvents, "save.status", {
          isSaving: state.isSaving,
          isAutoSaving: state.isAutoSaving,
        });
      }

      if (
        state.structureModified !== prev.structureModified
        || state.themeSettingsModified !== prev.themeSettingsModified
        || state.modifiedWidgets.size !== prev.modifiedWidgets.size
      ) {
        pushEvent(setEvents, "save.dirty", {
          modifiedWidgets: Array.from(state.modifiedWidgets),
          structureModified: state.structureModified,
          themeSettingsModified: state.themeSettingsModified,
        });
      }
    }),
    [],
  );

  useEffect(
    () => useToastStore.subscribe((state, prev) => {
      if (state.toasts.length > prev.toasts.length) {
        const latestToast = state.toasts.at(-1);
        if (latestToast) {
          pushEvent(setEvents, "toast.show", {
            variant: latestToast.variant,
            message: latestToast.message,
          });
        }
      }
    }),
    [],
  );

  return events;
}

function DebugSection({ title, data, defaultOpen = false }) {
  return (
    <details open={defaultOpen} className="rounded border border-slate-800 bg-slate-950/60">
      <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
        {title}
      </summary>
      <pre className="max-h-64 overflow-auto border-t border-slate-800 px-3 py-2 text-[11px] leading-5 text-slate-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

export default function DebugStatePanel() {
  const location = useLocation();
  const projectState = useProjectStore();
  const pageState = usePageStore();
  const themeState = useThemeStore();
  const widgetState = useWidgetStore();
  const autoSaveState = useAutoSave();
  const toastState = useToastStore();

  const [isOpen, setIsOpen] = useState(readStoredOpenState);
  const [copyStatus, setCopyStatus] = useState("idle");
  const events = useDebugEventLog(location);

  useEffect(() => {
    if (!DEBUG_STATE_ENABLED) return undefined;

    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!DEBUG_STATE_ENABLED) return;
    window.localStorage.setItem(PANEL_STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  const snapshots = useMemo(
    () => ({
      route: sanitizeValue({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      }),
      projectStore: sanitizeValue(projectState),
      pageStore: sanitizeValue(pageState),
      themeStore: sanitizeValue(themeState),
      widgetStore: sanitizeValue(widgetState),
      saveStore: sanitizeValue(autoSaveState),
      toastStore: sanitizeValue({ toasts: toastState.toasts }),
    }),
    [
      location.hash,
      location.pathname,
      location.search,
      projectState,
      pageState,
      themeState,
      widgetState,
      autoSaveState,
      toastState.toasts,
    ],
  );

  const summary = useMemo(
    () => ({
      activeProjectId: projectState.activeProject?.id ?? null,
      activeProjectName: projectState.activeProject?.name ?? null,
      route: `${location.pathname}${location.search}`,
      pageId: pageState.page?.id ?? null,
      pageLoadedProjectId: pageState.loadedProjectId,
      themeLoadedProjectId: themeState.loadedProjectId,
      themeDirty: themeState.hasUnsavedThemeChanges(),
      widgetSelection: {
        selectedWidgetId: widgetState.selectedWidgetId,
        selectedBlockId: widgetState.selectedBlockId,
        selectedGlobalWidgetId: widgetState.selectedGlobalWidgetId,
        selectedThemeGroup: widgetState.selectedThemeGroup,
      },
      saveState: {
        isSaving: autoSaveState.isSaving,
        isAutoSaving: autoSaveState.isAutoSaving,
        modifiedWidgets: Array.from(autoSaveState.modifiedWidgets),
        structureModified: autoSaveState.structureModified,
        themeSettingsModified: autoSaveState.themeSettingsModified,
        autoSaveTimerActive: Boolean(autoSaveState.autoSaveInterval),
      },
      toastCount: toastState.toasts.length,
    }),
    [
      autoSaveState.autoSaveInterval,
      autoSaveState.isAutoSaving,
      autoSaveState.isSaving,
      autoSaveState.modifiedWidgets,
      autoSaveState.structureModified,
      autoSaveState.themeSettingsModified,
      location.pathname,
      location.search,
      pageState.loadedProjectId,
      pageState.page?.id,
      projectState.activeProject?.id,
      projectState.activeProject?.name,
      themeState,
      toastState.toasts.length,
      widgetState.selectedBlockId,
      widgetState.selectedGlobalWidgetId,
      widgetState.selectedThemeGroup,
      widgetState.selectedWidgetId,
    ],
  );

  if (!DEBUG_STATE_ENABLED) return null;

  const handleCopySnapshot = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshots, null, 2));
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1200);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 1200);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-slate-100 shadow-lg backdrop-blur"
      >
        <Bug size={14} />
        Debug State
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-0 z-[100] flex h-screen w-[420px] max-w-[92vw] flex-col border-l border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-300">Dev Only</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Debug State</h2>
          <p className="mt-1 text-[11px] text-slate-400">Ctrl+Shift+D toggles this panel.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySnapshot}
            className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-900"
          >
            <Copy size={12} />
            {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Failed" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded border border-slate-700 p-1 text-slate-200 hover:bg-slate-900"
            aria-label="Collapse debug panel"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-3 text-[11px] leading-5 text-slate-300">
        <pre className="overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(summary, null, 2)}</pre>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <DebugSection title="Route" data={snapshots.route} defaultOpen />
        <DebugSection title="Project Store" data={snapshots.projectStore} />
        <DebugSection title="Page Store" data={snapshots.pageStore} />
        <DebugSection title="Theme Store" data={snapshots.themeStore} />
        <DebugSection title="Widget Store" data={snapshots.widgetStore} />
        <DebugSection title="Save Store" data={snapshots.saveStore} />
        <DebugSection title="Toast Store" data={snapshots.toastStore} />

        <details open className="rounded border border-slate-800 bg-slate-950/60">
          <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            Event Log
          </summary>
          <div className="max-h-72 overflow-auto border-t border-slate-800 px-3 py-2 text-[11px]">
            {events.length === 0 ? (
              <p className="text-slate-500">No events yet.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((event) => (
                  <li key={event.id} className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-pink-300">{event.type}</span>
                      <span className="text-slate-500">{event.at}</span>
                    </div>
                    <p className="mt-1 break-words text-slate-300">{formatEventPayload(event.payload)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="absolute left-[-36px] top-4 inline-flex h-9 w-9 items-center justify-center rounded-l-md border border-r-0 border-slate-800 bg-slate-950/95 text-slate-200 shadow-lg"
        aria-label="Collapse debug panel"
      >
        <ChevronLeft size={16} />
      </button>
    </aside>
  );
}
