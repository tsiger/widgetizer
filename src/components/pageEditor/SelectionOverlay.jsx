import { useState, useEffect, useCallback, useRef } from "react";
import useWidgetStore from "../../stores/widgetStore";
import { scrollWidgetIntoView } from "../../queries/previewManager";

/**
 * SelectionOverlay renders selection and hover boxes on top of the preview iframe.
 * This replaces the previous approach of injecting highlight styles into the iframe.
 */
export default function SelectionOverlay({
  iframeRef,
  selectedWidgetId,
  selectedBlockId,
  selectedGlobalWidgetId,
  onWidgetSelect,
  onBlockSelect,
  onGlobalWidgetSelect,
}) {
  const [selectionBounds, setSelectionBounds] = useState(null);
  const [blockBounds, setBlockBounds] = useState(null);
  const [widgetHoverBounds, setWidgetHoverBounds] = useState(null);
  const [blockHoverBounds, setBlockHoverBounds] = useState(null);
  const [widgetType, setWidgetType] = useState(null);
  const [hoverWidgetType, setHoverWidgetType] = useState(null);
  const overlayRef = useRef(null);

  // Get hover state from store (set by WidgetList on sidebar hover)
  const sidebarHoveredWidgetId = useWidgetStore((state) => state.hoveredWidgetId);
  const sidebarHoveredBlockId = useWidgetStore((state) => state.hoveredBlockId);

  // Preview hover state (from iframe mouseover events)
  const [previewHoveredWidgetId, setPreviewHoveredWidgetId] = useState(null);
  const [previewHoveredBlockId, setPreviewHoveredBlockId] = useState(null);

  // Combined hover - sidebar takes priority, then preview
  const hoveredWidgetId = sidebarHoveredWidgetId || previewHoveredWidgetId;
  const hoveredBlockId = sidebarHoveredWidgetId ? sidebarHoveredBlockId : previewHoveredBlockId;

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
   * Sync all overlay positions
   */
  const syncOverlay = useCallback(() => {
    // Update selection bounds
    if (effectiveWidgetId) {
      const widgetBounds = getElementBounds(`[data-widget-id="${effectiveWidgetId}"]`);
      setSelectionBounds(widgetBounds);

      // Get widget type for label
      const iframe = iframeRef?.current;
      if (iframe?.contentDocument) {
        const widgetEl = iframe.contentDocument.querySelector(`[data-widget-id="${effectiveWidgetId}"]`);
        setWidgetType(widgetEl?.getAttribute("data-widget-type") || null);
      }
    } else {
      setSelectionBounds(null);
      setWidgetType(null);
    }

    // Update block bounds
    if (selectedBlockId && effectiveWidgetId) {
      const bounds = getElementBounds(`[data-widget-id="${effectiveWidgetId}"] [data-block-id="${selectedBlockId}"]`);
      setBlockBounds(bounds);
    } else {
      setBlockBounds(null);
    }

    // Update hover bounds
    // Show widget hover when hovering a non-selected widget
    // Show block hover when hovering a block (either in selected or non-selected widget)
    if (hoveredWidgetId) {
      const isHoveringSelectedWidget = hoveredWidgetId === effectiveWidgetId;
      const isHoveringSelectedBlock = hoveredBlockId === selectedBlockId;

      // Widget hover: show when hovering a different widget than selected
      if (!isHoveringSelectedWidget) {
        const bounds = getElementBounds(`[data-widget-id="${hoveredWidgetId}"]`);
        setWidgetHoverBounds(bounds);

        // Get hover widget type
        const iframe = iframeRef?.current;
        if (iframe?.contentDocument) {
          const widgetEl = iframe.contentDocument.querySelector(`[data-widget-id="${hoveredWidgetId}"]`);
          setHoverWidgetType(widgetEl?.getAttribute("data-widget-type") || null);
        }
      } else {
        setWidgetHoverBounds(null);
        setHoverWidgetType(null);
      }

      // Block hover: show when hovering a block that isn't the selected block
      if (hoveredBlockId && !isHoveringSelectedBlock) {
        const bounds = getElementBounds(`[data-widget-id="${hoveredWidgetId}"] [data-block-id="${hoveredBlockId}"]`);
        setBlockHoverBounds(bounds);
      } else {
        setBlockHoverBounds(null);
      }
    } else {
      setWidgetHoverBounds(null);
      setBlockHoverBounds(null);
      setHoverWidgetType(null);
    }
  }, [effectiveWidgetId, selectedBlockId, hoveredWidgetId, hoveredBlockId, getElementBounds, iframeRef]);

  // Sync on selection/hover changes
  useEffect(() => {
    syncOverlay();
  }, [syncOverlay]);

  // Sync on iframe scroll
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe?.contentWindow) return;

    const handleScroll = () => {
      syncOverlay();
    };

    iframe.contentWindow.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      iframe.contentWindow?.removeEventListener("scroll", handleScroll);
    };
  }, [iframeRef, syncOverlay]);

  // Sync on iframe load
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const handleLoad = () => {
      // Small delay to ensure content is rendered
      setTimeout(syncOverlay, 100);
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [iframeRef, syncOverlay]);

  // Sync on iframe resize (handles preview mode changes)
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to debounce rapid resize events
      requestAnimationFrame(syncOverlay);
    });

    resizeObserver.observe(iframe);

    return () => {
      resizeObserver.disconnect();
    };
  }, [iframeRef, syncOverlay]);

  // Also sync on overlay container resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      syncOverlay();
    });

    if (overlayRef.current) {
      resizeObserver.observe(overlayRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [syncOverlay]);

  // Listen for messages from iframe (selection and hover)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "WIDGET_SELECTED") {
        const { widgetId, blockId } = event.data.payload;

        if (widgetId === "header" || widgetId === "footer") {
          onGlobalWidgetSelect?.(widgetId);
        } else {
          onWidgetSelect?.(widgetId);
          if (blockId) {
            onBlockSelect?.(blockId);
          }
        }
      } else if (event.data.type === "WIDGET_HOVERED") {
        const { widgetId, blockId } = event.data.payload;
        setPreviewHoveredWidgetId(widgetId);
        setPreviewHoveredBlockId(blockId);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onWidgetSelect, onBlockSelect, onGlobalWidgetSelect]);

  // Scroll selected widget into view
  useEffect(() => {
    if (effectiveWidgetId && iframeRef?.current) {
      scrollWidgetIntoView(iframeRef.current, effectiveWidgetId);
    }
  }, [effectiveWidgetId, iframeRef]);

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Widget hover box (render first so selection appears on top) */}
      {widgetHoverBounds && (
        <div
          className="absolute border border-blue-400/60 pointer-events-none"
          style={{
            top: widgetHoverBounds.top,
            left: widgetHoverBounds.left,
            width: widgetHoverBounds.width,
            height: widgetHoverBounds.height,
            backgroundColor: "rgba(59, 130, 246, 0.05)",
          }}
        >
          {/* Hover widget type label */}
          {hoverWidgetType && (
            <div
              className="absolute -top-5 left-0 px-1.5 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded pointer-events-none"
              style={{ fontSize: "9px" }}
            >
              {hoverWidgetType}
            </div>
          )}
        </div>
      )}

      {/* Block hover box */}
      {blockHoverBounds && (
        <div
          className="absolute border border-green-400/60 pointer-events-none"
          style={{
            top: blockHoverBounds.top,
            left: blockHoverBounds.left,
            width: blockHoverBounds.width,
            height: blockHoverBounds.height,
            backgroundColor: "rgba(34, 197, 94, 0.05)",
          }}
        />
      )}

      {/* Widget selection box */}
      {selectionBounds && (
        <div
          className="absolute border-2 border-blue-500 pointer-events-none"
          style={{
            top: selectionBounds.top,
            left: selectionBounds.left,
            width: selectionBounds.width,
            height: selectionBounds.height,
            boxShadow: "0 0 12px rgba(59, 130, 246, 0.3)",
          }}
        >
          {/* Widget type label */}
          {widgetType && (
            <div
              className="absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium text-white bg-blue-500 rounded-t pointer-events-none"
              style={{ fontSize: "10px" }}
            >
              {widgetType}
            </div>
          )}
        </div>
      )}

      {/* Block selection box */}
      {blockBounds && (
        <div
          className="absolute border-2 border-green-500 pointer-events-none"
          style={{
            top: blockBounds.top,
            left: blockBounds.left,
            width: blockBounds.width,
            height: blockBounds.height,
          }}
        />
      )}
    </div>
  );
}
