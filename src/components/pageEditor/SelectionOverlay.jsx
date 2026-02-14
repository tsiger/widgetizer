import { useEffect, useCallback } from "react";
import useWidgetStore from "../../stores/widgetStore";
import usePageStore from "../../stores/pageStore";
import { scrollElementIntoView } from "../../queries/previewManager";
import { PREVIEW_ISOLATION, PREVIEW_ORIGIN } from "../../config";

// PostMessage target origin
const TARGET_ORIGIN = PREVIEW_ISOLATION ? PREVIEW_ORIGIN : "*";

/**
 * SelectionOverlay - Message relay between React stores and the preview iframe.
 *
 * The visual overlay (selection/hover boxes, labels, reorder buttons) is now
 * rendered inside the iframe by previewRuntime.js. This component is purely
 * a message bridge:
 *
 * ## Iframe → Parent messages handled:
 * - WIDGET_SELECTED → calls onWidgetSelect / onBlockSelect / onGlobalWidgetSelect
 * - REORDER_WIDGET → calls reorderWidgets from store
 * Note: PREVIEW_READY is handled by PreviewPanel for scroll restoration
 *
 * ## Parent → Iframe messages sent:
 * - SCROLL_TO_ELEMENT — when selection changes
 * - UPDATE_SELECTION — when selection changes
 * - SIDEBAR_HOVER — when sidebar hover state changes
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
  structuralReloadRef,
}) {
  // Get hover state from store
  const sidebarHoveredWidgetId = useWidgetStore((state) => state.hoveredWidgetId);
  const sidebarHoveredBlockId = useWidgetStore((state) => state.hoveredBlockId);
  const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);
  const page = usePageStore((state) => state.page);

  const effectiveWidgetId = selectedWidgetId || selectedGlobalWidgetId;

  // Send message to iframe
  const postToIframe = useCallback(
    (message) => {
      const iframe = iframeRef?.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(message, TARGET_ORIGIN);
    },
    [iframeRef],
  );

  // Scroll and update selection when it changes
  useEffect(() => {
    if (effectiveWidgetId) {
      // Check the ref — it's set synchronously during PreviewPanel's render phase,
      // so it's already up-to-date when this effect fires.
      if (!structuralReloadRef?.current && iframeRef?.current) {
        scrollElementIntoView(iframeRef.current, effectiveWidgetId, selectedBlockId);
      }
      // Always send selection update (even during reload — it queues for the new iframe)
      postToIframe({
        type: "UPDATE_SELECTION",
        payload: { widgetId: effectiveWidgetId, blockId: selectedBlockId },
      });
    } else {
      // Clear selection in iframe
      postToIframe({
        type: "UPDATE_SELECTION",
        payload: { widgetId: null, blockId: null },
      });
    }
  }, [effectiveWidgetId, selectedBlockId, iframeRef, postToIframe, structuralReloadRef]);

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case "WIDGET_SELECTED":
          if (payload.widgetId === "header" || payload.widgetId === "footer") {
            onGlobalWidgetSelect?.(payload.widgetId);
          } else {
            onWidgetSelect?.(payload.widgetId);
          }
          if (payload.blockId) {
            onBlockSelect?.(payload.blockId);
          }
          break;

        case "REORDER_WIDGET": {
          const { widgetId, direction } = payload;
          const currentOrder = page?.widgetsOrder;
          if (!currentOrder || !widgetId) break;

          const index = currentOrder.indexOf(widgetId);
          if (index === -1) break;

          if (direction === "up" && index > 0) {
            const newOrder = [...currentOrder];
            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
            reorderWidgets(newOrder);
          } else if (direction === "down" && index < currentOrder.length - 1) {
            const newOrder = [...currentOrder];
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
            reorderWidgets(newOrder);
          }
          break;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [effectiveWidgetId, selectedBlockId, onWidgetSelect, onBlockSelect, onGlobalWidgetSelect, iframeRef, page, reorderWidgets]);

  // Send sidebar hover state to iframe
  useEffect(() => {
    postToIframe({
      type: "SIDEBAR_HOVER",
      payload: {
        widgetId: sidebarHoveredWidgetId || null,
        blockId: sidebarHoveredBlockId || null,
      },
    });
  }, [sidebarHoveredWidgetId, sidebarHoveredBlockId, postToIframe]);

  // Sync on iframe load
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const handleLoad = () => {
      if (effectiveWidgetId) {
        postToIframe({
          type: "UPDATE_SELECTION",
          payload: { widgetId: effectiveWidgetId, blockId: selectedBlockId },
        });
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [iframeRef, effectiveWidgetId, selectedBlockId, postToIframe]);

  // Sync on iframe resize (handles preview mode changes, NOT structural reloads)
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const resizeObserver = new ResizeObserver(() => {
      if (effectiveWidgetId && !structuralReloadRef?.current) {
        scrollElementIntoView(iframe, effectiveWidgetId, selectedBlockId);
      }
    });

    resizeObserver.observe(iframe);

    return () => {
      resizeObserver.disconnect();
    };
  }, [iframeRef, effectiveWidgetId, selectedBlockId, structuralReloadRef]);

  // Re-request selection sync when preview content changes
  useEffect(() => {
    if (previewReadyKey > 0 && effectiveWidgetId) {
      const timeoutId = setTimeout(() => {
        postToIframe({
          type: "UPDATE_SELECTION",
          payload: { widgetId: effectiveWidgetId, blockId: selectedBlockId },
        });
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [previewReadyKey, effectiveWidgetId, selectedBlockId, postToIframe]);

  // No visual rendering — overlay is inside the iframe
  return null;
}
