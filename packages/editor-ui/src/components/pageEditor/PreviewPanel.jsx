import { useState, useEffect, useLayoutEffect, useRef, useMemo, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { useThemeLocale } from "../../hooks/useThemeLocale";
import {
  applyRuntimeThemeSettings,
  fetchPreviewToken,
  invalidatePreviewUpdates,
  scrollElementIntoView,
  setPreviewThemeReads,
  updatePreview,
  updateThemeSettings,
} from "../../queries/previewManager";
import usePageStore from "../../stores/pageStore";
import useProjectStore from "../../stores/projectStore";
import useWidgetStore from "../../stores/widgetStore";
import { buildPreviewUrl, getPreviewTargetOrigin } from "../../lib/previewBase";
import { readPreviewMessage } from "../../lib/previewMessages";
import { createPreviewReloadCoordinator } from "../../lib/previewReload";
import SelectionOverlay from "./SelectionOverlay";

/**
 * Detect if changes are structural (requiring full reload) or content-only (can be morphed)
 * Structural: widgets added, removed, or reordered
 * Content: widget settings or block settings changed
 */
function detectChangeType(newState, oldState) {
  if (!oldState) {
    return { isStructural: true, changedWidgetIds: [], changedGlobalWidgetIds: [] };
  }

  const newWidgetIds = new Set(Object.keys(newState.widgets || {}));
  const oldWidgetIds = new Set(Object.keys(oldState.widgets || {}));

  // Check for added widgets
  const addedWidgets = [...newWidgetIds].filter((id) => !oldWidgetIds.has(id));
  // Check for removed widgets
  const removedWidgets = [...oldWidgetIds].filter((id) => !newWidgetIds.has(id));
  // Check for reordering
  const orderChanged = JSON.stringify(newState.page?.widgetsOrder) !== JSON.stringify(oldState.page?.widgetsOrder);
  // A shared area's widgets render in its own order, so reordering one is structural too.
  const areaOrders = (state) =>
    Object.fromEntries(Object.entries(state.sharedAreas || {}).map(([id, area]) => [id, area?.widgetsOrder || []]));
  const areaOrderChanged = JSON.stringify(areaOrders(newState)) !== JSON.stringify(areaOrders(oldState));

  const isStructural = addedWidgets.length > 0 || removedWidgets.length > 0 || orderChanged || areaOrderChanged;

  // Find widgets with content changes (settings, blocks)
  const changedWidgetIds = [];
  for (const id of newWidgetIds) {
    if (oldWidgetIds.has(id)) {
      const oldWidget = oldState.widgets[id];
      const newWidget = newState.widgets[id];
      if (oldWidget && newWidget) {
        const settingsChanged = JSON.stringify(oldWidget.settings) !== JSON.stringify(newWidget.settings);
        const blocksChanged = JSON.stringify(oldWidget.blocks) !== JSON.stringify(newWidget.blocks);
        const blockOrderChanged = JSON.stringify(oldWidget.blocksOrder) !== JSON.stringify(newWidget.blocksOrder);
        if (settingsChanged || blocksChanged || blockOrderChanged) {
          changedWidgetIds.push(id);
        }
      }
    }
  }

  // Check global widgets
  const changedGlobalWidgetIds = [];
  if (
    newState.globalWidgets?.header &&
    JSON.stringify(newState.globalWidgets.header) !== JSON.stringify(oldState.globalWidgets?.header)
  ) {
    changedGlobalWidgetIds.push("header");
  }
  if (
    newState.globalWidgets?.footer &&
    JSON.stringify(newState.globalWidgets.footer) !== JSON.stringify(oldState.globalWidgets?.footer)
  ) {
    changedGlobalWidgetIds.push("footer");
  }

  return { isStructural, changedWidgetIds, changedGlobalWidgetIds };
}

/**
 * Build a fieldTypes map for a widget's changed settings/blocks so the preview
 * runtime knows which fields are richtext (safe for innerHTML) vs plain text.
 */
function buildFieldTypes(widget, changedSettings, changedBlocks, schemas) {
  const widgetSchema = schemas[widget.type];
  if (!widgetSchema) return null;

  const fieldTypes = { settings: {}, blocks: {} };

  if (changedSettings && Array.isArray(widgetSchema.settings)) {
    for (const settingId of Object.keys(changedSettings)) {
      const settingSchema = widgetSchema.settings.find((s) => s.id === settingId);
      if (settingSchema) {
        fieldTypes.settings[settingId] = settingSchema.type;
      }
    }
  }

  if (changedBlocks && Array.isArray(widgetSchema.blocks)) {
    for (const [blockId, blockChanges] of Object.entries(changedBlocks)) {
      const block = widget.blocks?.[blockId];
      if (block && blockChanges.settings) {
        const blockSchema = widgetSchema.blocks.find((b) => b.type === block.type);
        if (blockSchema?.settings) {
          fieldTypes.blocks[blockId] = {};
          for (const settingId of Object.keys(blockChanges.settings)) {
            const settingSchema = blockSchema.settings.find((s) => s.id === settingId);
            if (settingSchema) {
              fieldTypes.blocks[blockId][settingId] = settingSchema.type;
            }
          }
        }
      }
    }
  }

  return fieldTypes;
}

/**
 * Build widget metadata map (widgetId → displayName) for the overlay labels.
 */
function buildWidgetMetadata(page, globalWidgets, schemas, tTheme) {
  const metadata = {};

  // Page widgets
  if (page?.widgets) {
    for (const [widgetId, widgetData] of Object.entries(page.widgets)) {
      const customName = widgetData?.settings?.name;
      const widgetType = widgetData?.type;
      metadata[widgetId] = customName || tTheme(schemas[widgetType]?.displayName) || widgetType || widgetId;
    }
  }

  // Global widgets
  if (globalWidgets) {
    for (const [key, widgetData] of Object.entries(globalWidgets)) {
      if (widgetData) {
        const customName = widgetData?.settings?.name;
        const widgetType = widgetData?.type;
        metadata[key] = customName || tTheme(schemas[widgetType]?.displayName) || widgetType || key;
      }
    }
  }

  return metadata;
}

const PreviewPanel = forwardRef(function PreviewPanel(
  {
    page,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    widgets: pageWidgets,
    themeSettings,
    previewMode = "desktop",
    runtimeMode = "editor",
    showSelectionOverlay = true,
    onWidgetSelect,
    onBlockSelect,
    onGlobalWidgetSelect,
  },
  ref,
) {
  const { t } = useTranslation();
  const { tTheme } = useThemeLocale();
  const [previewSrc, setPreviewSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [previewReadyKey, setPreviewReadyKey] = useState(0);
  const iframeRef = useRef(null);

  // A single ref to hold the entire previous state for comparison
  const previousStateRef = useRef(null);

  // Track structural reload state to prevent SelectionOverlay from scrolling prematurely.
  // The ref is set synchronously during render so child effects can read it immediately.
  const structuralReloadRef = useRef(false);

  // Store pending scroll info for after PREVIEW_READY
  const pendingScrollRef = useRef(null);

  // Where the preview document is scrolled, as its runtime last reported it: the
  // frame may be on another origin, where the editor can't read it.
  const lastScrollYRef = useRef(0);

  // Mints and shows every new preview document, and keeps the frame's preview
  // session alive when the host gives its documents one (OSS does not): widget
  // re-renders echo that session, and the next mint names it as the one it
  // replaces, so one frame holds one session however often it reloads.
  const reloadCoordinatorRef = useRef(null);

  // The site settings the preview shows right now (applied at once, ahead of the
  // debounced update), and a counter so a slower, older update never lands last.
  const appliedThemeRef = useRef(null);
  const updateSeqRef = useRef(0);

  // What the document being loaded was rendered from, and whether one is loading.
  // Edits made while it loads went to the outgoing document, so when it is ready
  // the editor compares against this snapshot and applies what is missing.
  const renderedStateRef = useRef(null);
  const navigatingRef = useRef(false);
  const [reconcileKey, setReconcileKey] = useState(0);

  const { globalWidgets, sharedAreas } = usePageStore();
  // The page's widgets and its shared areas' widgets together: ids never clash, and
  // both are on the previewed page, so selection, labels and live settings updates
  // treat them alike. Which list a widget is in only matters to the full render,
  // which is sent the areas themselves.
  const widgets = useMemo(() => {
    const merged = { ...(pageWidgets || {}) };
    for (const area of Object.values(sharedAreas || {})) Object.assign(merged, area?.widgets || {});
    return merged;
  }, [pageWidgets, sharedAreas]);
  const loadedProjectId = usePageStore((state) => state.loadedProjectId);
  const activeProject = useProjectStore((state) => state.activeProject);
  const schemas = useWidgetStore((state) => state.schemas);

  // What a reload renders: the editor's state as of the last commit. The
  // coordinator's callbacks outlive renders, so they read it from here; a layout
  // effect updates it before any effect below can start a load.
  const latestStateRef = useRef(null);
  useLayoutEffect(() => {
    latestStateRef.current = {
      page,
      widgets,
      globalWidgets,
      sharedAreas,
      themeSettings,
      selectedWidgetId,
      selectedBlockId,
      selectedGlobalWidgetId,
      runtimeMode,
    };
  });

  useEffect(() => {
    const coordinator = createPreviewReloadCoordinator({
      mint: async ({ replaces }) => {
        const { runtimeMode: mode, ...rendered } = latestStateRef.current;
        const enhancedPageData = { ...rendered.page, globalWidgets: rendered.globalWidgets, sharedAreas: rendered.sharedAreas };
        const answer = await fetchPreviewToken(enhancedPageData, rendered.themeSettings, mode, 1, { replaces });
        return { ...answer, rendered };
      },
      show: ({ token, rendered }) => {
        renderedStateRef.current = rendered;
        navigatingRef.current = true;
        setPreviewSrc(buildPreviewUrl(token));
        appliedThemeRef.current = rendered.themeSettings;
      },
      // The session ended: reload the way a structural change does, view and selection kept.
      beginReload: () => {
        const seq = ++updateSeqRef.current;
        const { selectedWidgetId: widgetId, selectedBlockId: blockId } = latestStateRef.current;
        pendingScrollRef.current = { scrollY: lastScrollYRef.current, widgetId, blockId };
        structuralReloadRef.current = true;
        return () => updateSeqRef.current === seq;
      },
      onReloadError: (err) => {
        console.error("Preview reload error:", err);
        structuralReloadRef.current = false;
        pendingScrollRef.current = null;
      },
    });
    reloadCoordinatorRef.current = coordinator;
    return () => coordinator.dispose();
  }, []);

  useEffect(() => {
    reloadCoordinatorRef.current?.release();
    previousStateRef.current = null;
    pendingScrollRef.current = null;
    lastScrollYRef.current = 0;
    structuralReloadRef.current = false;
    appliedThemeRef.current = null;
    updateSeqRef.current += 1;
    renderedStateRef.current = null;
    navigatingRef.current = false;
    setPreviewSrc(null);
    setError(null);
    setInitialLoadComplete(false);
    setLoading(Boolean(page?.id));
  }, [activeProject?.id, page?.id, runtimeMode]);

  // Detect structural changes during render (before child effects fire).
  // This sets the ref synchronously so SelectionOverlay can check it in its effects,
  // which is why refs are read and written during render here.
  /* eslint-disable react-hooks/refs */
  if (initialLoadComplete && previousStateRef.current) {
    const prev = previousStateRef.current;
    const contentChanged =
      JSON.stringify(page) !== JSON.stringify(prev?.page) ||
      JSON.stringify(widgets) !== JSON.stringify(prev?.widgets) ||
      JSON.stringify(globalWidgets) !== JSON.stringify(prev?.globalWidgets) ||
      JSON.stringify(sharedAreas) !== JSON.stringify(prev?.sharedAreas) ||
      JSON.stringify(themeSettings) !== JSON.stringify(prev?.themeSettings);

    if (contentChanged) {
      const newState = { page, widgets, globalWidgets, sharedAreas, themeSettings };
      const { isStructural } = detectChangeType(newState, prev);
      if (isStructural && !structuralReloadRef.current) {
        structuralReloadRef.current = true;
        // Capture scrollY now while the old iframe content is still present
        pendingScrollRef.current = {
          scrollY: lastScrollYRef.current,
          widgetId: selectedWidgetId,
          blockId: selectedBlockId,
        };
      }
    }
  }
  /* eslint-enable react-hooks/refs */

  // Expose the iframe ref to the parent component
  useEffect(() => {
    if (ref) {
      ref.current = iframeRef.current;
    }
  }, [ref]);

  // Listen for PREVIEW_READY from the iframe to handle post-reload scroll restoration,
  // and for the scroll position the runtime reports.
  useEffect(() => {
    const handleMessage = (event) => {
      // Only this panel's own preview document, and only a well-formed message.
      const message = readPreviewMessage(event, iframeRef.current);
      if (message?.type === "SCROLL_POSITION") {
        lastScrollYRef.current = message.payload.scrollY;
        return;
      }
      if (message?.type !== "PREVIEW_READY") return;
      setPreviewThemeReads(iframeRef.current, message.payload.themeReads);
      navigatingRef.current = false;
      const rendered = renderedStateRef.current;
      if (rendered) {
        previousStateRef.current = rendered;
        appliedThemeRef.current = rendered.themeSettings;
        setReconcileKey((key) => key + 1);
      }

      const pending = pendingScrollRef.current;
      if (pending) {
        pendingScrollRef.current = null;

        // 1. Restore previous scroll position instantly (no animation)
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: "RESTORE_SCROLL", payload: { scrollY: pending.scrollY } },
            getPreviewTargetOrigin(),
          );
        }

        // 2. Jump to the selected widget (instant, no smooth scroll)
        if (pending.widgetId && iframeRef.current) {
          scrollElementIntoView(iframeRef.current, pending.widgetId, pending.blockId);
        }

        // 3. End structural reload gate
        structuralReloadRef.current = false;
        setPreviewReadyKey((prev) => prev + 1);
      } else {
        // Non-structural reload (initial load, etc.)
        setPreviewReadyKey((prev) => prev + 1);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Send widget metadata to iframe whenever widget data or schemas change
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !initialLoadComplete) return;

    const metadata = buildWidgetMetadata({ ...page, widgets }, globalWidgets, schemas, tTheme);
    const widgetOrder = page?.widgetsOrder || [];

    iframeRef.current.contentWindow.postMessage(
      { type: "SET_WIDGET_METADATA", payload: { metadata, widgetOrder } },
      getPreviewTargetOrigin(),
    );
  }, [page, widgets, globalWidgets, schemas, tTheme, initialLoadComplete, previewReadyKey]);

  // Initial page load effect
  useEffect(() => {
    if (!page || initialLoadComplete) return;
    // Skip if page data belongs to a different project (stale state during switch)
    if (activeProject?.id && loadedProjectId && activeProject.id !== loadedProjectId) return;

    async function loadInitialPreview() {
      const coordinator = reloadCoordinatorRef.current;
      try {
        setLoading(true);
        setError(null);

        // Not shown only when this panel's coordinator was replaced meanwhile (the
        // effects re-ran); the load the new one started owns the frame.
        if (!(await coordinator.load())) return;

        // Store the initial state for future diffing
        previousStateRef.current = renderedStateRef.current;
      } catch (err) {
        console.error("Preview error:", err);
        setError(err.message || "Failed to load preview");
      }
      setLoading(false);
      setInitialLoadComplete(true);
    }

    loadInitialPreview();
  }, [
    page,
    initialLoadComplete,
    activeProject?.id,
    loadedProjectId,
    globalWidgets,
    sharedAreas,
    themeSettings,
    widgets,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    runtimeMode,
  ]);

  // Handle updates after initial load
  useEffect(() => {
    if (!initialLoadComplete || !iframeRef.current) return;

    const previousState = previousStateRef.current;

    // Skip if only selection changed
    const contentChanged =
      JSON.stringify(page) !== JSON.stringify(previousState?.page) ||
      JSON.stringify(widgets) !== JSON.stringify(previousState?.widgets) ||
      JSON.stringify(globalWidgets) !== JSON.stringify(previousState?.globalWidgets) ||
      JSON.stringify(sharedAreas) !== JSON.stringify(previousState?.sharedAreas) ||
      JSON.stringify(themeSettings) !== JSON.stringify(previousState?.themeSettings);

    if (!contentChanged) {
      // Back at the baseline: an update still in flight is for an edit that was
      // undone, and the preview may still show undone site settings.
      invalidatePreviewUpdates(iframeRef.current);
      updateSeqRef.current += 1;
      if (appliedThemeRef.current && JSON.stringify(appliedThemeRef.current) !== JSON.stringify(themeSettings)) {
        updateThemeSettings(iframeRef.current, themeSettings);
        appliedThemeRef.current = themeSettings;
      }
      // A reload that was cancelled before it navigated will send no PREVIEW_READY.
      if (!navigatingRef.current) {
        structuralReloadRef.current = false;
        pendingScrollRef.current = null;
      }
      previousStateRef.current = {
        page,
        widgets,
        globalWidgets,
        sharedAreas,
        themeSettings,
        selectedWidgetId,
        selectedBlockId,
        selectedGlobalWidgetId,
      };
      return;
    }

    const newState = { page, widgets, globalWidgets, sharedAreas, themeSettings };
    const { isStructural } = detectChangeType(newState, previousState);

    // Site settings the runtime applies itself (CSS variables, fonts, style classes)
    // show at once, without waiting for the debounce or any widget render.
    if (!isStructural && JSON.stringify(themeSettings) !== JSON.stringify(appliedThemeRef.current)) {
      applyRuntimeThemeSettings(iframeRef.current, themeSettings);
      appliedThemeRef.current = themeSettings;
    }

    // Immediate visual feedback for simple setting changes (text/images)
    if (!isStructural && iframeRef.current?.contentWindow && previousState?.widgets) {
      Object.entries(widgets || {}).forEach(([widgetId, widget]) => {
        const oldWidget = previousState.widgets[widgetId];
        if (!oldWidget) return;

        const settingsChanged = JSON.stringify(widget.settings) !== JSON.stringify(oldWidget.settings);
        const blocksSettingsChanged = widget.blocksOrder?.some((blockId) => {
          const newBlock = widget.blocks?.[blockId];
          const oldBlock = oldWidget.blocks?.[blockId];
          return newBlock && oldBlock && JSON.stringify(newBlock.settings) !== JSON.stringify(oldBlock.settings);
        });

        if (settingsChanged || blocksSettingsChanged) {
          const changes = { settings: {}, blocks: {} };

          if (settingsChanged) {
            Object.entries(widget.settings || {}).forEach(([key, value]) => {
              if (JSON.stringify(value) !== JSON.stringify(oldWidget.settings?.[key])) {
                changes.settings[key] = value;
              }
            });
          }

          if (blocksSettingsChanged) {
            widget.blocksOrder?.forEach((blockId) => {
              const newBlock = widget.blocks?.[blockId];
              const oldBlock = oldWidget.blocks?.[blockId];
              if (newBlock && oldBlock) {
                const changedBlockSettings = {};
                Object.entries(newBlock.settings || {}).forEach(([key, value]) => {
                  if (JSON.stringify(value) !== JSON.stringify(oldBlock.settings?.[key])) {
                    changedBlockSettings[key] = value;
                  }
                });
                if (Object.keys(changedBlockSettings).length > 0) {
                  changes.blocks[blockId] = { settings: changedBlockSettings };
                }
              }
            });
          }

          const fieldTypes = buildFieldTypes(widget, changes.settings, changes.blocks, schemas);

          iframeRef.current.contentWindow.postMessage(
            { type: "UPDATE_WIDGET_SETTINGS", payload: { widgetId, changes, fieldTypes } },
            getPreviewTargetOrigin(),
          );
        }
      });

      // Also handle global widgets for real-time feedback
      Object.entries(globalWidgets || {}).forEach(([globalWidgetKey, globalWidget]) => {
        const oldGlobalWidget = previousState.globalWidgets?.[globalWidgetKey];
        if (!globalWidget || !oldGlobalWidget) return;

        const settingsChanged = JSON.stringify(globalWidget.settings) !== JSON.stringify(oldGlobalWidget.settings);
        const blocksSettingsChanged = globalWidget.blocksOrder?.some((blockId) => {
          const newBlock = globalWidget.blocks?.[blockId];
          const oldBlock = oldGlobalWidget.blocks?.[blockId];
          return newBlock && oldBlock && JSON.stringify(newBlock.settings) !== JSON.stringify(oldBlock.settings);
        });

        if (settingsChanged || blocksSettingsChanged) {
          const changes = { settings: {}, blocks: {} };

          if (settingsChanged) {
            Object.entries(globalWidget.settings || {}).forEach(([key, value]) => {
              if (JSON.stringify(value) !== JSON.stringify(oldGlobalWidget.settings?.[key])) {
                changes.settings[key] = value;
              }
            });
          }

          if (blocksSettingsChanged) {
            globalWidget.blocksOrder?.forEach((blockId) => {
              const newBlock = globalWidget.blocks?.[blockId];
              const oldBlock = oldGlobalWidget.blocks?.[blockId];
              if (newBlock && oldBlock) {
                const changedBlockSettings = {};
                Object.entries(newBlock.settings || {}).forEach(([key, value]) => {
                  if (JSON.stringify(value) !== JSON.stringify(oldBlock.settings?.[key])) {
                    changedBlockSettings[key] = value;
                  }
                });
                if (Object.keys(changedBlockSettings).length > 0) {
                  changes.blocks[blockId] = { settings: changedBlockSettings };
                }
              }
            });
          }

          const fieldTypes = buildFieldTypes(globalWidget, changes.settings, changes.blocks, schemas);

          iframeRef.current.contentWindow.postMessage(
            { type: "UPDATE_WIDGET_SETTINGS", payload: { widgetId: globalWidgetKey, changes, fieldTypes } },
            getPreviewTargetOrigin(),
          );
        }
      });

      // Immediate transparent-header body class toggle when header setting changes
      const oldTransparent = previousState.globalWidgets?.header?.settings?.transparent_on_hero;
      const newTransparent = globalWidgets?.header?.settings?.transparent_on_hero;
      if (oldTransparent !== newTransparent) {
        let shouldBeTransparent = false;
        if (newTransparent) {
          const widgetOrder = page?.widgetsOrder || Object.keys(widgets || {});
          const firstWidgetId = widgetOrder[0];
          const firstWidget = firstWidgetId && widgets?.[firstWidgetId];
          if (firstWidget) {
            shouldBeTransparent = schemas[firstWidget.type]?.supportsTransparentHeader === true;
          }
        }
        iframeRef.current.contentWindow.postMessage(
          { type: "UPDATE_BODY_CLASS", payload: { className: "transparent-header", enabled: shouldBeTransparent } },
          getPreviewTargetOrigin(),
        );
      }
    }

    // Debounced update - either full reload or morph depending on change type
    const timeoutId = setTimeout(async () => {
      const seq = ++updateSeqRef.current;
      const isCurrent = () => updateSeqRef.current === seq;
      const reload = () => reloadCoordinatorRef.current.load(isCurrent);
      try {
        if (isStructural) {
          // STRUCTURAL CHANGE: Full page reload
          console.log("[Preview] FULL PAGE RELOAD (structural change)");

          await reload();
          // PREVIEW_READY handler will restore scroll + ungate SelectionOverlay
        } else {
          // CONTENT CHANGE: Morph individual widgets
          console.log("[Preview] PARTIAL UPDATE (content change only)");

          // Capture scrollY before morph
          const morphScrollY = lastScrollYRef.current;

          const updateState = {
            widgets,
            globalWidgets,
            sharedAreas,
            themeSettings,
            selectedWidgetId,
            selectedGlobalWidgetId,
            page,
          };

          const result = await updatePreview(iframeRef.current, updateState, previousState || {}, {
            session: reloadCoordinatorRef.current.session,
          });

          // A newer update is under way and compares against the same baseline,
          // so it covers this change too.
          if (result?.stale || !isCurrent()) return;

          if (result?.needsReload) {
            // The page layout reads a changed site setting, or the document's session
            // ended: only a full render shows it.
            pendingScrollRef.current = { scrollY: morphScrollY, widgetId: selectedWidgetId, blockId: selectedBlockId };
            structuralReloadRef.current = true;
            await reload();
          } else {
            // Restore scroll position after morph. The runtime already keeps the view
            // still across each swap; this lands after the morphs it was sent.
            iframeRef.current?.contentWindow?.postMessage(
              { type: "RESTORE_SCROLL", payload: { scrollY: morphScrollY } },
              getPreviewTargetOrigin(),
            );
            setPreviewReadyKey((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error("Preview update error:", err);
        // Fallback to full reload on any error
        try {
          await reload();
        } catch (fallbackErr) {
          console.error("Preview fallback reload error:", fallbackErr);
        }
      }

      if (!isCurrent()) return;
      previousStateRef.current = {
        page,
        widgets,
        globalWidgets,
        sharedAreas,
        themeSettings,
        selectedWidgetId,
        selectedBlockId,
        selectedGlobalWidgetId,
      };
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    initialLoadComplete,
    reconcileKey,
    page,
    widgets,
    globalWidgets,
    sharedAreas,
    themeSettings,
    schemas,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    runtimeMode,
  ]);

  return (
    <div
      className={`flex-1 relative transition-colors duration-300 ${
        previewMode === "desktop" ? "bg-white" : "bg-slate-200"
      }`}
    >
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-20">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-400 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="mt-2 text-sm text-slate-500">{t("pageEditor.preview.loading")}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-red-50 p-4 text-red-700 z-20">
          <p className="font-bold">{t("pageEditor.preview.error")}</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setInitialLoadComplete(false)}
            className="mt-2 px-2 py-1 bg-red-200 text-red-800 rounded text-xs hover:bg-red-300"
          >
            {t("pageEditor.preview.reload")}
          </button>
        </div>
      )}
      {previewSrc && (
        <iframe
          ref={iframeRef}
          src={previewSrc}
          title={t("pageEditor.preview.title")}
          {...(runtimeMode === "standalone"
            ? {
                sandbox:
                  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation allow-top-navigation-by-user-activation",
              }
            : {})}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className={`w-full h-full border-0 transition-all duration-300 ease-in-out mx-auto ${
            previewMode !== "desktop" ? "shadow-2xl" : ""
          }`}
          style={{
            maxWidth: previewMode === "desktop" ? "100%" : previewMode === "tablet" ? "48rem" : "24rem",
          }}
          onLoad={() => {
            setInitialLoadComplete(true);
          }}
        />
      )}
      {showSelectionOverlay && (
        <SelectionOverlay
          iframeRef={iframeRef}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          selectedGlobalWidgetId={selectedGlobalWidgetId}
          onWidgetSelect={onWidgetSelect}
          onBlockSelect={onBlockSelect}
          onGlobalWidgetSelect={onGlobalWidgetSelect}
          previewReadyKey={previewReadyKey}
          structuralReloadRef={structuralReloadRef}
        />
      )}
    </div>
  );
});

export default PreviewPanel;
