import { useState, useEffect, useRef, forwardRef } from "react";
import {
  fetchPreview,
  updatePreview, // Import the new master update function
  highlightWidget,
} from "../../queries/previewManager";
import useProjectStore from "../../stores/projectStore";
import usePageStore from "../../stores/pageStore";
import { API_URL } from "../../config";

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

  // The new, unified update effect
  useEffect(() => {
    // Don't run updates until the initial HTML has been loaded and rendered
    if (!initialLoadComplete || !iframeRef.current) return;

    const currentState = {
      page,
      widgets,
      globalWidgets,
      themeSettings,
      selectedWidgetId,
      selectedBlockId,
      selectedGlobalWidgetId,
    };

    // Call the master update function
    updatePreview(iframeRef.current, currentState, previousStateRef.current);

    // After the update, save the current state for the next comparison
    previousStateRef.current = currentState;
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

  // Highlight widget/block on selection change - keep this for immediate feedback
  useEffect(() => {
    if (!initialLoadComplete || !iframeRef.current) return;
    highlightWidget(iframeRef.current, selectedWidgetId || selectedGlobalWidgetId, selectedBlockId);
  }, [selectedWidgetId, selectedBlockId, selectedGlobalWidgetId, initialLoadComplete]);

  // Handle messages from the iframe (e.g., widget selection)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "WIDGET_SELECTED") {
        const { widgetId, blockId } = event.data.payload;

        if (widgetId === "header" || widgetId === "footer") {
          onGlobalWidgetSelect?.(widgetId);
          // Global widgets don't support block selection in the current store implementation
        } else {
          onWidgetSelect?.(widgetId);
          if (blockId) {
            // We need to set the block ID after the widget ID, as setting the widget ID clears the block ID
            // Using a small timeout to ensure the state update order if needed, 
            // but since zustand is synchronous, calling them in order should work.
            // However, React batching might be an issue if they trigger re-renders.
            // But let's try direct calls first.
            onBlockSelect?.(blockId);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onWidgetSelect, onBlockSelect, onGlobalWidgetSelect]);

  const iframeSrcDoc = previewHtml.replace(
    "</head>",
    `<script src="${API_URL(
      "/runtime/previewRuntime.js",
    )}"></script><base href="${activeProject?.liveUrl || document.baseURI}" target="_blank"></head>`,
  );

  return (
    <div className="flex-1 bg-white relative">
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
        className={`w-full h-full border-0 transition-all duration-300 ease-in-out ${
          previewMode === "desktop" ? "max-w-full" : ""
        } ${previewMode === "tablet" ? "max-w-3xl mx-auto shadow-2xl" : ""} ${
          previewMode === "mobile" ? "max-w-sm mx-auto shadow-2xl" : ""
        }`}
        onLoad={() => {
          // This will be called after the initial srcDoc is loaded
          setInitialLoadComplete(true);
        }}
      />
    </div>
  );
});

export default PreviewPanel;
