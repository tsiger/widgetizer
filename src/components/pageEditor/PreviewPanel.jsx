import { useState, useEffect, useRef, forwardRef } from "react";
import { fetchPreview, scrollWidgetIntoView } from "../../queries/previewManager";
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

const PreviewPanel = forwardRef(function PreviewPanel(
  {
    page,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    widgets,
    widgetSchemas,
    themeSettings,
    previewMode = "desktop",
    onWidgetSelect,
    onBlockSelect,
    onGlobalWidgetSelect,
  },
  ref,
) {
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
        const html = await fetchPreview(enhancedPageData, themeSettings);
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
  }, [page, initialLoadComplete, globalWidgets, themeSettings, widgets]);

  // Full reload on widget/page/theme changes (debounced)
  // But also send immediate updates for real-time feedback
  useEffect(() => {
    if (!initialLoadComplete) return;

    const previousState = previousStateRef.current;

    // Check if only selection changed (no reload needed, just highlight)
    const contentChanged =
      JSON.stringify(page) !== JSON.stringify(previousState?.page) ||
      JSON.stringify(widgets) !== JSON.stringify(previousState?.widgets) ||
      JSON.stringify(globalWidgets) !== JSON.stringify(previousState?.globalWidgets) ||
      JSON.stringify(themeSettings) !== JSON.stringify(previousState?.themeSettings);

    if (!contentChanged) {
      // Only selection changed - overlay handles highlighting now
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

    // Send IMMEDIATE real-time updates for changed widget settings
    // This provides instant feedback while the debounced reload is pending
    if (iframeRef.current?.contentWindow && previousState?.widgets) {
      Object.entries(widgets || {}).forEach(([widgetId, widget]) => {
        const oldWidget = previousState.widgets[widgetId];
        if (!oldWidget) return; // New widget, will be handled by reload

        // Check for setting changes (not structural)
        const settingsChanged = JSON.stringify(widget.settings) !== JSON.stringify(oldWidget.settings);
        const blocksSettingsChanged = widget.blocksOrder?.some((blockId) => {
          const newBlock = widget.blocks?.[blockId];
          const oldBlock = oldWidget.blocks?.[blockId];
          return newBlock && oldBlock && JSON.stringify(newBlock.settings) !== JSON.stringify(oldBlock.settings);
        });

        if (settingsChanged || blocksSettingsChanged) {
          // Compute changed settings only
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

          // Send update to iframe
          iframeRef.current.contentWindow.postMessage(
            {
              type: "UPDATE_WIDGET_SETTINGS",
              payload: { widgetId, changes },
            },
            "*",
          );
        }
      });
    }

    // Content changed - debounce the reload
    const timeoutId = setTimeout(async () => {
      try {
        // Save scroll position
        const scrollY = iframeRef.current?.contentWindow?.scrollY || 0;

        // Fetch fresh HTML
        const enhancedPageData = { ...page, globalWidgets };
        const html = await fetchPreview(enhancedPageData, themeSettings);
        setPreviewHtml(html);

        // Restore scroll position OR scroll to selected widget after structural changes
        const handleLoad = () => {
          // Check if the widgets order changed (reordering)
          const orderChanged = JSON.stringify(page?.widgetsOrder) !== JSON.stringify(previousState?.page?.widgetsOrder);
          // Check if the selected widget is new (not in previous widgets)
          const isNewWidget = selectedWidgetId && previousState?.widgets && !previousState.widgets[selectedWidgetId];

          if ((isNewWidget || orderChanged) && selectedWidgetId && iframeRef.current) {
            // First restore scroll position instantly (so scroll starts from where user was)
            iframeRef.current.contentWindow?.scrollTo(0, scrollY);
            // Then smooth scroll to the widget in its new position
            setTimeout(() => {
              scrollWidgetIntoView(iframeRef.current, selectedWidgetId);
            }, 50);
          } else {
            // Restore scroll position for regular updates
            iframeRef.current?.contentWindow?.scrollTo(0, scrollY);
          }

          // Notify SelectionOverlay that content is ready
          setPreviewReadyKey((prev) => prev + 1);
        };

        if (iframeRef.current) {
          iframeRef.current.addEventListener("load", handleLoad, { once: true });
        }
      } catch (err) {
        console.error("Preview reload error:", err);
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
    }, 300); // 300ms debounce

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
  ]);

  // Message handler moved to SelectionOverlay component

  // Validate URLs for security (HTML comes from our own server, so no sanitization needed)
  const safeBaseUrl = getSafeBaseUrl(activeProject?.liveUrl, document.baseURI);

  const iframeSrcDoc = previewHtml.replace(
    "</head>",
    `<script src="${API_URL(
      "/runtime/previewRuntime.js",
    )}"></script><base href="${safeBaseUrl}" target="_blank"></head>`,
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
            <p className="mt-2 text-sm text-slate-500">Loading Preview...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-red-50 p-4 text-red-700 z-20">
          <p className="font-bold">Preview Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setInitialLoadComplete(false)}
            className="mt-2 px-2 py-1 bg-red-200 text-red-800 rounded text-xs hover:bg-red-300"
          >
            Reload Preview
          </button>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={iframeSrcDoc}
        title="Page Preview"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        className={`w-full h-full border-0 transition-all duration-300 ease-in-out mx-auto ${
          previewMode !== "desktop" ? "shadow-2xl" : ""
        }`}
        style={{
          maxWidth: previewMode === "desktop" ? "100%" : previewMode === "tablet" ? "48rem" : "24rem",
        }}
        onLoad={() => {
          // This will be called after the initial srcDoc is loaded
          setInitialLoadComplete(true);
        }}
      />
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
    </div>
  );
});

export default PreviewPanel;
