import { useState, useEffect, useRef, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { fetchPreview, scrollElementIntoView, updatePreview } from "../../queries/previewManager";
import useProjectStore from "../../stores/projectStore";
import usePageStore from "../../stores/pageStore";
import { API_URL } from "../../config";
import SelectionOverlay from "./SelectionOverlay";

/**
 * Validate liveUrl to prevent malicious base href injection.
 * Only allows http/https URLs.
 */
function getSafeBaseUrl(liveUrl, fallback) {
  if (!liveUrl) return fallback;
  try {
    const url = new URL(liveUrl);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return liveUrl;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

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
  const orderChanged =
    JSON.stringify(newState.page?.widgetsOrder) !== JSON.stringify(oldState.page?.widgetsOrder);

  const isStructural = addedWidgets.length > 0 || removedWidgets.length > 0 || orderChanged;

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

const PreviewPanel = forwardRef(function PreviewPanel(
  {
    page,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    widgets,
    themeSettings,
    previewMode = "desktop",
    runtimeMode = "editor",
    showSelectionOverlay = true,
    includeBaseTag = true,
    onWidgetSelect,
    onBlockSelect,
    onGlobalWidgetSelect,
  },
  ref,
) {
  const { t } = useTranslation();
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [previewReadyKey, setPreviewReadyKey] = useState(0);
  const iframeRef = useRef(null);

  // A single ref to hold the entire previous state for comparison
  const previousStateRef = useRef(null);

  const activeProject = useProjectStore((state) => state.activeProject);
  const { globalWidgets } = usePageStore();

  // Expose the iframe ref to the parent component
  useEffect(() => {
    if (ref) {
      ref.current = iframeRef.current;
    }
  }, [ref]);

  // Initial page load effect
  useEffect(() => {
    if (!page || initialLoadComplete) return;

    async function loadInitialPreview() {
      try {
        setLoading(true);
        setError(null);

        const enhancedPageData = { ...page, globalWidgets };
        const html = await fetchPreview(enhancedPageData, themeSettings, runtimeMode);
        setPreviewHtml(html);

        // Store the initial state for future diffing
        previousStateRef.current = {
          page,
          widgets,
          globalWidgets,
          themeSettings,
          selectedWidgetId,
          selectedBlockId,
          selectedGlobalWidgetId,
        };
      } catch (err) {
        console.error("Preview error:", err);
        setError(err.message || "Failed to load preview");
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    }

    loadInitialPreview();
  }, [
    page,
    initialLoadComplete,
    globalWidgets,
    themeSettings,
    widgets,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    runtimeMode,
  ]);

  // Handle updates after initial load
  // Strategy:
  // - Structural changes (add/remove/reorder widgets) → Full page reload
  // - Content changes (settings only) → Morph individual widgets
  useEffect(() => {
    if (!initialLoadComplete || !iframeRef.current) return;

    const previousState = previousStateRef.current;

    // Skip if only selection changed
    const contentChanged =
      JSON.stringify(page) !== JSON.stringify(previousState?.page) ||
      JSON.stringify(widgets) !== JSON.stringify(previousState?.widgets) ||
      JSON.stringify(globalWidgets) !== JSON.stringify(previousState?.globalWidgets) ||
      JSON.stringify(themeSettings) !== JSON.stringify(previousState?.themeSettings);

    if (!contentChanged) {
      previousStateRef.current = {
        page,
        widgets,
        globalWidgets,
        themeSettings,
        selectedWidgetId,
        selectedBlockId,
        selectedGlobalWidgetId,
      };
      return;
    }

    const newState = { page, widgets, globalWidgets, themeSettings };
    const { isStructural, changedWidgetIds, changedGlobalWidgetIds } = detectChangeType(newState, previousState);

    // [DEBUG] Log change detection
    console.log("[Preview] Change detected:", {
      isStructural,
      changedWidgetIds,
      changedGlobalWidgetIds,
    });

    // Immediate visual feedback for simple setting changes (text/images)
    // This runs regardless of structural vs content changes
    if (iframeRef.current?.contentWindow && previousState?.widgets) {
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

          iframeRef.current.contentWindow.postMessage(
            { type: "UPDATE_WIDGET_SETTINGS", payload: { widgetId, changes } },
            "*",
          );
        }
      });

      // Also handle global widgets for real-time feedback
      Object.entries(globalWidgets || {}).forEach(([globalWidgetKey, globalWidget]) => {
        const oldGlobalWidget = previousState.globalWidgets?.[globalWidgetKey];
        if (!globalWidget || !oldGlobalWidget) return;

        const settingsChanged = JSON.stringify(globalWidget.settings) !== JSON.stringify(oldGlobalWidget.settings);

        if (settingsChanged) {
          const changes = { settings: {} };
          Object.entries(globalWidget.settings || {}).forEach(([key, value]) => {
            if (JSON.stringify(value) !== JSON.stringify(oldGlobalWidget.settings?.[key])) {
              changes.settings[key] = value;
            }
          });

          iframeRef.current.contentWindow.postMessage(
            { type: "UPDATE_WIDGET_SETTINGS", payload: { widgetId: globalWidgetKey, changes } },
            "*",
          );
        }
      });
    }

    // Debounced update - either full reload or morph depending on change type
    const timeoutId = setTimeout(async () => {
      try {
        const scrollY = iframeRef.current?.contentWindow?.scrollY || 0;

        if (isStructural) {
          // STRUCTURAL CHANGE: Full page reload
          // This ensures enqueued scripts/styles are properly loaded for new widgets
          console.log("[Preview] 🔄 FULL PAGE RELOAD (structural change)");
          const enhancedPageData = { ...page, globalWidgets };
          const html = await fetchPreview(enhancedPageData, themeSettings, runtimeMode);
          setPreviewHtml(html);

          // After reload, scroll to selected widget
          setTimeout(() => {
            if (selectedWidgetId && iframeRef.current) {
              scrollElementIntoView(iframeRef.current, selectedWidgetId, selectedBlockId);
            }
            setPreviewReadyKey((prev) => prev + 1);
          }, 100);
        } else {
          // CONTENT CHANGE: Morph individual widgets
          console.log("[Preview] ⚡ PARTIAL UPDATE (content change only)");
          const updateState = {
            widgets,
            globalWidgets,
            themeSettings,
            selectedWidgetId,
            selectedGlobalWidgetId,
            page,
          };

          await updatePreview(iframeRef.current, updateState, previousState || {});

          // Restore scroll position
          setTimeout(() => {
            iframeRef.current?.contentWindow?.scrollTo(0, scrollY);
            setPreviewReadyKey((prev) => prev + 1);
          }, 100);
        }
      } catch (err) {
        console.error("Preview update error:", err);
        // Fallback to full reload on any error
        try {
          const enhancedPageData = { ...page, globalWidgets };
          const html = await fetchPreview(enhancedPageData, themeSettings, runtimeMode);
          setPreviewHtml(html);
        } catch (fallbackErr) {
          console.error("Preview fallback reload error:", fallbackErr);
        }
      }

      previousStateRef.current = {
        page,
        widgets,
        globalWidgets,
        themeSettings,
        selectedWidgetId,
        selectedBlockId,
        selectedGlobalWidgetId,
      };
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    initialLoadComplete,
    page,
    widgets,
    globalWidgets,
    themeSettings,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    runtimeMode,
  ]);

  // Validate URLs for security
  const safeBaseUrl = getSafeBaseUrl(activeProject?.liveUrl, document.baseURI);
  const baseTag = includeBaseTag ? `<base href="${safeBaseUrl}" target="_blank">` : "";

  const iframeSrcDoc = previewHtml.replace(
    "</head>",
    `<script src="${API_URL(
      "/runtime/previewRuntime.js",
    )}" type="module" data-preview-mode="${runtimeMode}"></script>${baseTag}</head>`,
  );

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
      <iframe
        ref={iframeRef}
        srcDoc={iframeSrcDoc}
        title={t("pageEditor.preview.title")}
        sandbox={
          runtimeMode === "standalone"
            ? "allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
            : "allow-scripts allow-same-origin allow-popups allow-forms"
        }
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
        />
      )}
    </div>
  );
});

export default PreviewPanel;
