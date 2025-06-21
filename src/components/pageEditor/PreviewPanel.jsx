import { useState, useEffect, useRef } from "react";
import { fetchPreview, updateThemeSettings, highlightWidget, updateWidget } from "../../utils/previewManager";
import useProjectStore from "../../stores/projectStore";
import usePageStore from "../../stores/pageStore";
import { API_URL } from "../../config";

export default function PreviewPanel({
  page,
  selectedWidgetId,
  selectedBlockId,
  selectedGlobalWidgetId,
  widgets,
  widgetSchemas,
  themeSettings,
  previewMode = "desktop",
}) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const iframeRef = useRef(null);
  const prevThemeSettingsRef = useRef(null);
  const prevWidgetsRef = useRef(null);
  const prevGlobalWidgetsRef = useRef(null);
  const widgetSettingsRef = useRef(new Map());
  const activeProject = useProjectStore((state) => state.activeProject);

  const { globalWidgets } = usePageStore();

  // Load the initial preview or refresh when widgets structure changes
  useEffect(() => {
    if (!page) {
      setLoading(false);
      return;
    }

    // Check if widgets order has changed by comparing stringified widgets
    const currentWidgetsString = JSON.stringify(Object.keys(widgets || {}));
    const prevWidgetsString = prevWidgetsRef.current ? JSON.stringify(Object.keys(prevWidgetsRef.current || {})) : null;

    const widgetsOrderChanged = currentWidgetsString !== prevWidgetsString;

    // FIXED: Only reload on structural changes, not settings changes
    // Do a full reload if we haven't loaded yet or if the widgets order changed
    if (!initialLoadComplete || widgetsOrderChanged) {
      async function loadPreview() {
        try {
          setLoading(true);
          setError(null);

          // NEW: Create enhanced page data with global widgets for preview
          const enhancedPageData = {
            ...page,
            // Add global widgets back for server rendering (temporary for preview)
            globalWidgets: globalWidgets,
          };

          // Fetch the preview HTML from the server
          const html = await fetchPreview(enhancedPageData, themeSettings);
          setPreviewHtml(html);
          setInitialLoadComplete(true);
          prevThemeSettingsRef.current = JSON.parse(JSON.stringify(themeSettings));
          prevWidgetsRef.current = JSON.parse(JSON.stringify(widgets));
          prevGlobalWidgetsRef.current = JSON.parse(JSON.stringify(globalWidgets)); // NEW: Track global widgets

          // Reset widget settings cache
          widgetSettingsRef.current = new Map();
          Object.entries(widgets || {}).forEach(([widgetId, widget]) => {
            widgetSettingsRef.current.set(widgetId, { ...widget.settings });
          });
        } catch (err) {
          console.error("Preview error:", err);
          setError(err.message || "Failed to load preview");
        } finally {
          setLoading(false);
        }
      }

      loadPreview();
    }
  }, [page, widgets, initialLoadComplete]); // FIXED: Removed globalWidgets from dependencies to prevent full reloads

  // Update theme settings without reloading
  useEffect(() => {
    if (!initialLoadComplete || !iframeRef.current || !themeSettings) return;

    // Only update if theme settings have changed
    if (JSON.stringify(themeSettings) !== JSON.stringify(prevThemeSettingsRef.current)) {
      updateThemeSettings(iframeRef.current, themeSettings);
      prevThemeSettingsRef.current = JSON.parse(JSON.stringify(themeSettings));
    }
  }, [themeSettings, initialLoadComplete]);

  // Update widget settings by re-rendering the widget
  useEffect(() => {
    if (!initialLoadComplete || !iframeRef.current || !widgets) return;

    // Make sure the iframe and its document are fully loaded
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);

    if (!iframeDoc) {
      console.log("Iframe document not ready yet, skipping widget update");
      return;
    }

    // Get the current widget IDs in the iframe
    const existingWidgetIds = new Set();
    iframeDoc.querySelectorAll("[data-widget-id]").forEach((el) => {
      existingWidgetIds.add(el.getAttribute("data-widget-id"));
    });

    // Check each widget for setting changes
    Object.entries(widgets).forEach(async ([widgetId, widget]) => {
      const prevWidget = prevWidgetsRef.current?.[widgetId];

      // Compare current and previous widget state
      const hasChanges = JSON.stringify(widget) !== JSON.stringify(prevWidget);

      if (hasChanges && existingWidgetIds.has(widgetId)) {
        try {
          // Pass themeSettings to updateWidget
          const success = await updateWidget(iframe, widgetId, widget, selectedBlockId, themeSettings);
          if (success) {
            // Update our cache
            if (!prevWidgetsRef.current) prevWidgetsRef.current = {};
            prevWidgetsRef.current[widgetId] = JSON.parse(JSON.stringify(widget));
          }
        } catch (error) {
          console.error(`Error updating widget ${widgetId}:`, error);
        }
      }
    });
  }, [widgets, initialLoadComplete, themeSettings, selectedBlockId]);

  // FIXED: Update global widgets by re-rendering them (individual updates, not full reload)
  useEffect(() => {
    if (!initialLoadComplete || !iframeRef.current || !globalWidgets) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);

    if (!iframeDoc) {
      console.log("Iframe document not ready yet, skipping global widget update");
      return;
    }

    // Check header widget for changes (only settings, not structural)
    if (globalWidgets.header && prevGlobalWidgetsRef.current?.header) {
      const hasHeaderChanges =
        JSON.stringify(globalWidgets.header.settings) !== JSON.stringify(prevGlobalWidgetsRef.current.header.settings);

      if (hasHeaderChanges) {
        updateWidget(iframe, "header", globalWidgets.header, selectedBlockId, themeSettings)
          .then((success) => {
            if (success && prevGlobalWidgetsRef.current) {
              prevGlobalWidgetsRef.current.header = JSON.parse(JSON.stringify(globalWidgets.header));
            }
          })
          .catch((error) => console.error("Error updating header widget:", error));
      }
    }

    // Check footer widget for changes (only settings, not structural)
    if (globalWidgets.footer && prevGlobalWidgetsRef.current?.footer) {
      const hasFooterChanges =
        JSON.stringify(globalWidgets.footer.settings) !== JSON.stringify(prevGlobalWidgetsRef.current.footer.settings);

      if (hasFooterChanges) {
        updateWidget(iframe, "footer", globalWidgets.footer, selectedBlockId, themeSettings)
          .then((success) => {
            if (success && prevGlobalWidgetsRef.current) {
              prevGlobalWidgetsRef.current.footer = JSON.parse(JSON.stringify(globalWidgets.footer));
            }
          })
          .catch((error) => console.error("Error updating footer widget:", error));
      }
    }
  }, [globalWidgets, initialLoadComplete, themeSettings, selectedBlockId]);

  // Highlight selected widget or block (updated to handle global widgets)
  useEffect(() => {
    if (!initialLoadComplete || !iframeRef.current) return;

    // Add a small delay to ensure the DOM is ready after any updates
    const highlightTimer = setTimeout(() => {
      // NEW: Handle global widget highlighting
      if (selectedGlobalWidgetId) {
        highlightWidget(iframeRef.current, selectedGlobalWidgetId, selectedBlockId);
      } else {
        highlightWidget(iframeRef.current, selectedWidgetId, selectedBlockId);
      }
    }, 50);

    return () => clearTimeout(highlightTimer);
  }, [selectedWidgetId, selectedBlockId, selectedGlobalWidgetId, initialLoadComplete, previewHtml]); // NEW: Added selectedGlobalWidgetId

  // Update iframe content when HTML changes
  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return;

    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);

      if (!iframeDoc) {
        console.error("Could not access iframe document");
        return;
      }

      // Clear any existing content
      iframeDoc.open();

      // Transform image paths to API URLs for preview
      const transformedHtml = previewHtml.replace(
        /src="\/uploads\/images\//g,
        `src="${API_URL("/api/media/projects/")}${activeProject.id}/uploads/images/`,
      );

      // Write the new content
      iframeDoc.write(transformedHtml);

      // Close the document
      iframeDoc.close();

      // Ensure the iframe window is properly initialized
      if (iframe.contentWindow && typeof iframe.contentWindow.PreviewRuntime !== "undefined") {
        iframe.contentWindow.PreviewRuntime.initializeRuntime();
      }
    } catch (error) {
      console.error("Error updating iframe content:", error);
      setError("Failed to update preview");
    }
  }, [previewHtml, activeProject]);

  // Initialize the settings cache when the preview loads
  useEffect(() => {
    if (initialLoadComplete && widgets) {
      // Reset widget settings cache
      widgetSettingsRef.current = new Map();
      Object.entries(widgets || {}).forEach(([widgetId, widget]) => {
        widgetSettingsRef.current.set(widgetId, { ...widget.settings });
      });
    }
  }, [initialLoadComplete, widgets]);

  return (
    <div className="flex-1 bg-slate-100 relative flex justify-center overflow-auto">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            <p className="mt-2 text-sm text-slate-600">Loading preview...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
          <div className="text-red-500 text-center">
            <p className="text-lg font-medium">Error loading preview</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* FIXED: Simplified iframe container to prevent double scrollbars */}
      <div
        className={`bg-white shadow-lg transition-all duration-300 ${
          previewMode === "mobile"
            ? "w-[375px] h-[667px]"
            : previewMode === "tablet"
              ? "w-[768px] h-[1024px]"
              : "w-full h-full"
        }`}
      >
        <iframe ref={iframeRef} className="w-full h-full border-0" title="Page Preview" />
      </div>
    </div>
  );
}
