import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import useWidgetStore from "../../stores/widgetStore";
import usePageStore from "../../stores/pageStore";
import { scrollWidgetIntoView } from "../../queries/previewManager";

/**
 * SelectionOverlay - Renders selection and hover boxes on top of the preview iframe.
 *
 * ## Architecture
 * This component uses a message-based communication pattern with the iframe's previewRuntime.js
 * to handle element bounds calculation. The iframe reports bounds via postMessage, which avoids
 * cross-frame timing issues and ensures accurate positioning.
 *
 * ## Message Flow
 *
 * ### Selection:
 * 1. User selects widget → effectiveWidgetId changes
 * 2. Component sends SCROLL_TO_WIDGET message to iframe
 * 3. Iframe scrolls to widget and reports ELEMENT_BOUNDS after scroll completes
 * 4. Component receives bounds, translates to overlay coords, renders selection box
 *
 * ### Hover (from preview):
 * 1. User hovers in iframe → iframe sends WIDGET_HOVERED with bounds
 * 2. Component receives, translates bounds, renders hover box
 *
 * ### Hover (from sidebar):
 * 1. User hovers in sidebar → sidebarHoveredWidgetId changes
 * 2. Component calculates bounds directly (queries iframe DOM)
 * 3. Renders hover box
 *
 * ### Scroll tracking:
 * 1. User scrolls in iframe → iframe sends updated ELEMENT_BOUNDS and WIDGET_HOVERED
 * 2. Component updates overlay positions in real-time
 *
 * ## Key Messages (iframe → parent):
 * - ELEMENT_BOUNDS: Reports widget/block positions after scroll or on request
 * - WIDGET_HOVERED: Reports hover state with bounds during hover/scroll
 * - WIDGET_SELECTED: Reports click selection from preview
 * - PREVIEW_READY: Signals iframe is ready for messages
 *
 * ## Key Messages (parent → iframe):
 * - SCROLL_TO_WIDGET: Scroll widget into view (iframe reports bounds after)
 * - UPDATE_SELECTION: Update tracked selection and report bounds
 *
 * @see src/utils/previewRuntime.js - Iframe-side message handling
 * @see docs/selection-overlay-scenarios.md - Test scenarios
 */
export default function SelectionOverlay({
  iframeRef,
  selectedWidgetId,
  selectedBlockId,
  selectedGlobalWidgetId,
  onWidgetSelect,
  onBlockSelect,
  onGlobalWidgetSelect,
  previewReadyKey,
}) {
  const { t } = useTranslation();
  const [selectionBounds, setSelectionBounds] = useState(null);
  const [blockBounds, setBlockBounds] = useState(null);
  const [widgetHoverBounds, setWidgetHoverBounds] = useState(null);
  const [blockHoverBounds, setBlockHoverBounds] = useState(null);
  const [widgetDisplayName, setWidgetDisplayName] = useState(null);
  const [hoverWidgetDisplayName, setHoverWidgetDisplayName] = useState(null);
  const overlayRef = useRef(null);

  // Get hover state and schemas from store
  const sidebarHoveredWidgetId = useWidgetStore((state) => state.hoveredWidgetId);
  const sidebarHoveredBlockId = useWidgetStore((state) => state.hoveredBlockId);
  const schemas = useWidgetStore((state) => state.schemas);
  const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);
  const page = usePageStore((state) => state.page);

  // Preview hover state (from iframe mouseover events)
  const [previewHoveredWidgetId, setPreviewHoveredWidgetId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [_previewHoveredBlockId, setPreviewHoveredBlockId] = useState(null);

  // Get the effective widget ID (could be regular or global)
  const effectiveWidgetId = selectedWidgetId || selectedGlobalWidgetId;

  /**
   * Calculate element bounds relative to the overlay container
   */
  const getElementBounds = useCallback(
    (selector) => {
      const iframe = iframeRef?.current;
      if (!iframe?.contentDocument) return null;

      const iframeDoc = iframe.contentDocument;
      const element = iframeDoc.querySelector(selector);
      if (!element) return null;

      const iframeRect = iframe.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const overlayRect = overlayRef.current?.getBoundingClientRect();

      if (!overlayRect) return null;

      // Translate iframe-local coords to overlay-relative coords
      return {
        top: iframeRect.top - overlayRect.top + elementRect.top,
        left: iframeRect.left - overlayRect.left + elementRect.left,
        width: elementRect.width,
        height: elementRect.height,
      };
    },
    [iframeRef],
  );

  /**
   * Translate bounds received from iframe to overlay-relative coords
   */
  const translateBoundsToOverlay = useCallback(
    (iframeBounds) => {
      if (!iframeBounds) return null;

      const iframe = iframeRef?.current;
      const overlayRect = overlayRef.current?.getBoundingClientRect();
      const iframeRect = iframe?.getBoundingClientRect();

      if (!overlayRect || !iframeRect) return null;

      return {
        top: iframeRect.top - overlayRect.top + iframeBounds.top,
        left: iframeRect.left - overlayRect.left + iframeBounds.left,
        width: iframeBounds.width,
        height: iframeBounds.height,
      };
    },
    [iframeRef],
  );

  /**
   * Request bounds from iframe
   */
  const requestBounds = useCallback(
    (widgetId, blockId = null) => {
      const iframe = iframeRef?.current;
      if (!iframe?.contentWindow) return;

      iframe.contentWindow.postMessage(
        {
          type: "UPDATE_SELECTION",
          payload: { widgetId, blockId },
        },
        "*",
      );
    },
    [iframeRef],
  );

  // Scroll and update display name when selection changes
  useEffect(() => {
    if (effectiveWidgetId) {
      // Scroll to widget - iframe will report bounds after scroll settles
      if (iframeRef?.current) {
        scrollWidgetIntoView(iframeRef.current, effectiveWidgetId);
      }

      // Update display name
      const customName = page?.widgets?.[effectiveWidgetId]?.settings?.name;
      const widgetType = page?.widgets?.[effectiveWidgetId]?.type;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWidgetDisplayName(customName || schemas[widgetType]?.displayName || widgetType || null);
    } else {
      setSelectionBounds(null);
      setWidgetDisplayName(null);
    }
  }, [effectiveWidgetId, selectedBlockId, page, schemas, iframeRef]);

  // Listen for all iframe messages
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case "PREVIEW_READY":
          // On preview ready, scroll and request bounds
          if (effectiveWidgetId && iframeRef?.current) {
            scrollWidgetIntoView(iframeRef.current, effectiveWidgetId);
          }
          break;

        case "ELEMENT_BOUNDS":
          // Received bounds from iframe - translate and apply
          if (payload.widgetId === effectiveWidgetId) {
            const translated = translateBoundsToOverlay(payload.bounds);
            setSelectionBounds(translated);

            if (payload.blockId && payload.blockBounds) {
              const translatedBlock = translateBoundsToOverlay(payload.blockBounds);
              setBlockBounds(translatedBlock);
            } else {
              setBlockBounds(null);
            }
          }
          break;

        case "WIDGET_SELECTED":
          if (payload.widgetId === "header" || payload.widgetId === "footer") {
            onGlobalWidgetSelect?.(payload.widgetId);
          } else {
            onWidgetSelect?.(payload.widgetId);
            if (payload.blockId) {
              onBlockSelect?.(payload.blockId);
            }
          }
          break;

        case "WIDGET_HOVERED":
          setPreviewHoveredWidgetId(payload.widgetId);
          setPreviewHoveredBlockId(payload.blockId);

          // Handle hover bounds from message
          if (payload.widgetId && payload.widgetId !== effectiveWidgetId) {
            // Hovering a different widget - show widget hover
            const translated = translateBoundsToOverlay(payload.bounds);
            setWidgetHoverBounds(translated);

            // Get display name for hovered widget
            const widgetType = page?.widgets?.[payload.widgetId]?.type;
            const customName = page?.widgets?.[payload.widgetId]?.settings?.name;
            setHoverWidgetDisplayName(customName || schemas[widgetType]?.displayName || widgetType || null);
          } else {
            // Hovering the selected widget or nothing - no widget hover
            setWidgetHoverBounds(null);
            setHoverWidgetDisplayName(null);
          }

          // Block hover - works for any widget including the selected one
          if (payload.blockId && payload.blockId !== selectedBlockId) {
            const translatedBlock = translateBoundsToOverlay(payload.blockBounds);
            setBlockHoverBounds(translatedBlock);
          } else {
            setBlockHoverBounds(null);
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    effectiveWidgetId,
    selectedBlockId,
    translateBoundsToOverlay,
    onWidgetSelect,
    onBlockSelect,
    onGlobalWidgetSelect,
    iframeRef,
    page,
    schemas,
  ]);

  // Handle sidebar hover (calculated locally since it doesn't come from iframe)
  useEffect(() => {
    // Widget hover: show when hovering a different widget than selected
    if (sidebarHoveredWidgetId && sidebarHoveredWidgetId !== effectiveWidgetId) {
      const bounds = getElementBounds(`[data-widget-id="${sidebarHoveredWidgetId}"]`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing hover state from sidebar
      setWidgetHoverBounds(bounds);

      const widgetType = page?.widgets?.[sidebarHoveredWidgetId]?.type;
      const customName = page?.widgets?.[sidebarHoveredWidgetId]?.settings?.name;

      setHoverWidgetDisplayName(customName || schemas[widgetType]?.displayName || widgetType || null);
    } else if (!previewHoveredWidgetId) {
      // Only clear widget hover if preview isn't also hovering
      setWidgetHoverBounds(null);
      setHoverWidgetDisplayName(null);
    }

    // Block hover: show when hovering a block that isn't the selected block
    // This works for both the selected widget AND other widgets
    if (sidebarHoveredBlockId && sidebarHoveredBlockId !== selectedBlockId) {
      // Use the hovered widget if available, otherwise use the selected widget
      const targetWidgetId = sidebarHoveredWidgetId || effectiveWidgetId;
      if (targetWidgetId) {
        const blockBounds = getElementBounds(
          `[data-widget-id="${targetWidgetId}"] [data-block-id="${sidebarHoveredBlockId}"]`,
        );
        setBlockHoverBounds(blockBounds);
      }
    } else if (!previewHoveredWidgetId) {
      setBlockHoverBounds(null);
    }
  }, [
    sidebarHoveredWidgetId,
    sidebarHoveredBlockId,
    effectiveWidgetId,
    selectedBlockId,
    previewHoveredWidgetId,
    previewReadyKey, // Recalculate when content changes
    getElementBounds,
    page,
    schemas,
  ]);

  // Sync on iframe load
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const handleLoad = () => {
      if (effectiveWidgetId) {
        requestBounds(effectiveWidgetId, selectedBlockId);
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [iframeRef, effectiveWidgetId, selectedBlockId, requestBounds]);

  // Sync on iframe resize (handles preview mode changes)
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const resizeObserver = new ResizeObserver(() => {
      if (effectiveWidgetId) {
        // Scroll to widget after layout change (desktop/mobile switch)
        scrollWidgetIntoView(iframe, effectiveWidgetId);
      }
    });

    resizeObserver.observe(iframe);

    return () => {
      resizeObserver.disconnect();
    };
  }, [iframeRef, effectiveWidgetId, selectedBlockId]);

  // Also sync on overlay container resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (effectiveWidgetId) {
        requestBounds(effectiveWidgetId, selectedBlockId);
      }
    });

    if (overlayRef.current) {
      resizeObserver.observe(overlayRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [effectiveWidgetId, selectedBlockId, requestBounds]);

  // Re-request bounds when preview content changes (after widget morph or reload)
  // This ensures overlay dimensions update when widget content changes (e.g., image resize)
  useEffect(() => {
    if (previewReadyKey > 0) {
      // Clear hover bounds - positions have changed, old bounds are stale
      // User will get fresh hover on next mouse move
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale state after content reload
      setWidgetHoverBounds(null);
      setBlockHoverBounds(null);
      setHoverWidgetDisplayName(null);

      // Re-request selection bounds after DOM settles
      if (effectiveWidgetId) {
        const timeoutId = setTimeout(() => {
          requestBounds(effectiveWidgetId, selectedBlockId);
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [previewReadyKey, effectiveWidgetId, selectedBlockId, requestBounds]);

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-10">
      {/* Widget hover box (render first so selection appears on top) */}
      {widgetHoverBounds && (
        <div
          className="absolute border border-pink-300 pointer-events-none"
          style={{
            top: widgetHoverBounds.top,
            left: widgetHoverBounds.left,
            width: widgetHoverBounds.width,
            height: widgetHoverBounds.height,
            backgroundColor: "rgba(236, 72, 153, 0.05)",
          }}
        >
          {/* Hover widget displayName label */}
          {hoverWidgetDisplayName && (
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-xs font-medium text-pink-600 bg-pink-100 rounded pointer-events-none whitespace-nowrap"
              style={{ fontSize: "11px" }}
            >
              {hoverWidgetDisplayName}
            </div>
          )}
        </div>
      )}

      {/* Block hover box */}
      {blockHoverBounds && (
        <div
          className="absolute border border-blue-300 pointer-events-none"
          style={{
            top: blockHoverBounds.top,
            left: blockHoverBounds.left,
            width: blockHoverBounds.width,
            height: blockHoverBounds.height,
            backgroundColor: "rgba(59, 130, 246, 0.05)",
          }}
        />
      )}

      {/* Widget selection box */}
      {selectionBounds && effectiveWidgetId && (
        <div
          className="absolute border-2 border-pink-400"
          style={{
            top: selectionBounds.top,
            left: selectionBounds.left,
            width: selectionBounds.width,
            height: selectionBounds.height,
            boxShadow: "0 0 12px rgba(236, 72, 153, 0.25)",
            pointerEvents: "none",
          }}
        >
          {/* Widget label and reorder buttons */}
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1"
            style={{ pointerEvents: "auto" }}
          >
            {/* Reorder up button */}
            {page?.widgetsOrder &&
              page.widgetsOrder.length > 1 &&
              selectedWidgetId &&
              page.widgetsOrder.includes(selectedWidgetId) && (
                <button
                  className={`p-0.5 rounded bg-white border border-slate-200 shadow-sm transition-all ${
                    page.widgetsOrder.indexOf(selectedWidgetId) === 0
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-pink-50 hover:border-pink-300 cursor-pointer"
                  }`}
                  disabled={page.widgetsOrder.indexOf(selectedWidgetId) === 0}
                  onClick={() => {
                    const currentOrder = page.widgetsOrder;
                    const index = currentOrder.indexOf(selectedWidgetId);
                    if (index > 0) {
                      const newOrder = [...currentOrder];
                      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                      reorderWidgets(newOrder);
                    }
                  }}
                  title={t("pageEditor.actions.moveWidgetUp")}
                >
                  <ChevronUp size={14} className="text-slate-600" />
                </button>
              )}

            {/* Widget displayName label */}
            {widgetDisplayName && (
              <div
                className="px-2 py-0.5 text-xs font-medium text-white bg-pink-500 rounded pointer-events-none whitespace-nowrap"
                style={{ fontSize: "11px" }}
              >
                {widgetDisplayName}
              </div>
            )}

            {/* Reorder down button */}
            {page?.widgetsOrder &&
              page.widgetsOrder.length > 1 &&
              selectedWidgetId &&
              page.widgetsOrder.includes(selectedWidgetId) && (
                <button
                  className={`p-0.5 rounded bg-white border border-slate-200 shadow-sm transition-all ${
                    page.widgetsOrder.indexOf(selectedWidgetId) === page.widgetsOrder.length - 1
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-pink-50 hover:border-pink-300 cursor-pointer"
                  }`}
                  disabled={page.widgetsOrder.indexOf(selectedWidgetId) === page.widgetsOrder.length - 1}
                  onClick={() => {
                    const currentOrder = page.widgetsOrder;
                    const index = currentOrder.indexOf(selectedWidgetId);
                    if (index < currentOrder.length - 1) {
                      const newOrder = [...currentOrder];
                      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                      reorderWidgets(newOrder);
                    }
                  }}
                  title={t("pageEditor.actions.moveWidgetDown")}
                >
                  <ChevronDown size={14} className="text-slate-600" />
                </button>
              )}
          </div>
        </div>
      )}

      {/* Block selection box */}
      {blockBounds && (
        <div
          className="absolute border-2 border-blue-400 pointer-events-none"
          style={{
            top: blockBounds.top,
            left: blockBounds.left,
            width: blockBounds.width,
            height: blockBounds.height,
            boxShadow: "0 0 8px rgba(59, 130, 246, 0.2)",
          }}
        />
      )}
    </div>
  );
}
