/*
This is the runtime script that is injected into the preview iframe.
It handles CSS variable updates, font loading, real-time settings updates,
and click detection for widget selection.

Note: Widget highlighting is now handled by the SelectionOverlay component
in the parent window, not by this script.
*/

// Handle CSS variable updates
function updateCssVariables(variables) {
  const styleTag = document.getElementById("theme-settings-styles");
  if (!styleTag) {
    console.warn("[PreviewRuntime] Could not find #theme-settings-styles tag");
    return;
  }

  const cssString = Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n  ");

  styleTag.textContent = `:root {\n  ${cssString}\n}`;
}

// Load Google Fonts
function loadFonts(fontsMetadata) {
  if (!fontsMetadata || typeof fontsMetadata !== "object" || Object.keys(fontsMetadata).length === 0) {
    return;
  }

  const base = "https://fonts.googleapis.com/css2";
  const families = Object.entries(fontsMetadata)
    .map(([name, weights]) => {
      const sortedWeights = weights.sort((a, b) => a - b);
      return `family=${encodeURIComponent(name)}:wght@${sortedWeights.join(";")}`;
    })
    .join("&");

  const url = `${base}?${families}&display=swap`;

  let link = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  link.href = url;
}

// Scroll to widget and report bounds when done
let currentSelectedWidgetId = null;
let currentSelectedBlockId = null;

function scrollToWidget(widgetId) {
  if (!widgetId) return;

  currentSelectedWidgetId = widgetId;
  // Attach resize observer to track dynamic size changes (e.g., accordion)
  observeWidgetResize(widgetId);

  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) {
    reportElementBounds(widgetId, currentSelectedBlockId);
    return;
  }

  const rect = widget.getBoundingClientRect();
  const padding = 40;
  const viewportHeight = window.innerHeight;

  // Check if widget is already fully visible in the viewport
  const isFullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight;

  if (isFullyVisible) {
    // Skip scrolling - widget is already visible, just report bounds
    reportElementBounds(widgetId, currentSelectedBlockId);
    return;
  }

  const documentHeight = document.documentElement.scrollHeight;
  let targetScroll = window.scrollY + rect.top - padding;

  // Clamp to valid scroll range (prevent over-scroll)
  const maxScroll = documentHeight - viewportHeight;
  targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

  // Scroll smoothly
  window.scrollTo({
    top: targetScroll,
    behavior: "smooth",
  });

  // Report bounds after scroll animation
  setTimeout(() => {
    reportElementBounds(widgetId, currentSelectedBlockId);
  }, 400);
}

// Calculate and report element bounds to parent
function reportElementBounds(widgetId, blockId = null) {
  let bounds = null;
  let blockBounds = null;

  if (widgetId) {
    const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (widget) {
      const rect = widget.getBoundingClientRect();
      bounds = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      if (blockId) {
        const block = widget.querySelector(`[data-block-id="${blockId}"]`);
        if (block) {
          const blockRect = block.getBoundingClientRect();
          blockBounds = {
            top: blockRect.top,
            left: blockRect.left,
            width: blockRect.width,
            height: blockRect.height,
          };
        }
      }
    }
  }

  window.parent.postMessage(
    {
      type: "ELEMENT_BOUNDS",
      payload: { widgetId, blockId, bounds, blockBounds },
    },
    "*",
  );
}

// Report bounds on user scroll (debounced)
let scrollDebounceTimer = null;
function setupScrollBoundsReporting() {
  window.addEventListener(
    "scroll",
    () => {
      if (scrollDebounceTimer) cancelAnimationFrame(scrollDebounceTimer);
      scrollDebounceTimer = requestAnimationFrame(() => {
        // Report selection bounds
        if (currentSelectedWidgetId) {
          reportElementBounds(currentSelectedWidgetId, currentSelectedBlockId);
        }
        // Report hover bounds
        if (currentHoveredWidgetId) {
          reportHoverBounds();
        }
      });
    },
    { passive: true },
  );
}

// Update selection function
function updateSelection(widgetId, blockId) {
  currentSelectedWidgetId = widgetId;
  currentSelectedBlockId = blockId;

  // Re-attach resize observer when selection changes
  observeWidgetResize(widgetId);

  // Dispatch event so widgets can react to block selection (e.g., slideshow switching slides)
  if (widgetId && blockId) {
    const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (widget) {
      const event = new CustomEvent("widget:block-select", {
        detail: { blockId },
        bubbles: true,
      });
      widget.dispatchEvent(event);
    }
  }
}

// Update widget settings in real-time for immediate feedback while typing
// This avoids waiting for the debounced full reload
function updateWidgetSettings(widgetId, changes) {
  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) return;

  if (changes.settings) {
    Object.entries(changes.settings).forEach(([settingId, value]) => {
      applySettingToElement(widget, settingId, value);
    });
  }

  if (changes.blocks) {
    Object.entries(changes.blocks).forEach(([blockId, blockChanges]) => {
      const blockEl = widget.querySelector(`[data-block-id="${blockId}"]`);
      if (blockEl && blockChanges.settings) {
        Object.entries(blockChanges.settings).forEach(([settingId, value]) => {
          applySettingToElement(blockEl, settingId, value);
        });
      }
    });
  }
}

// Apply a setting value to elements within a container
function applySettingToElement(container, settingId, value) {
  // Find elements with this data-setting inside the container
  const childElements = [...container.querySelectorAll(`[data-setting="${settingId}"]`)];

  // Also check if the container itself has the data-setting attribute
  const elements = container.matches(`[data-setting="${settingId}"]`) ? [container, ...childElements] : childElements;

  elements.forEach((el) => {
    // Check if this element belongs to a nested block (prevent bleeding)
    // Skip if the element is the container itself (it's always valid)
    if (el !== container) {
      const closestBlock = el.closest("[data-block-id]");
      if (closestBlock && closestBlock !== container) {
        return;
      }
    }

    const tagName = el.tagName.toLowerCase();

    if (tagName === "img") {
      if (typeof value === "string") {
        el.src = value;
      } else if (value?.url) {
        el.src = value.url;
      }
    } else if (tagName === "video") {
      if (typeof value === "string") {
        el.src = value;
      } else if (value?.url) {
        el.src = value.url;
      }
    } else if (tagName === "a") {
      if (typeof value === "object") {
        if (value.href !== undefined) el.href = value.href;
        if (value.text !== undefined) el.textContent = value.text;
      } else {
        el.textContent = value;
      }
    } else {
      if (typeof value === "string" || typeof value === "number") {
        el.textContent = value;
      } else if (value?.text) {
        el.textContent = value.text;
      }
    }
  });
}

// Message handler
function handleMessage(event) {
  const { type, payload } = event.data;

  switch (type) {
    case "UPDATE_CSS_VARIABLES":
      updateCssVariables(payload);
      break;
    case "LOAD_FONTS":
      loadFonts(payload);
      break;
    case "SCROLL_TO_WIDGET":
      scrollToWidget(payload.widgetId);
      break;
    case "UPDATE_WIDGET_SETTINGS":
      updateWidgetSettings(payload.widgetId, payload.changes);
      break;
    case "GET_ELEMENT_BOUNDS":
      reportElementBounds(payload.widgetId, payload.blockId);
      break;
    case "UPDATE_SELECTION":
      updateSelection(payload.widgetId, payload.blockId);
      reportElementBounds(payload.widgetId, payload.blockId);
      break;
    // Legacy message types - no longer used but kept for compatibility
    case "HIGHLIGHT_WIDGET":
    case "HOVER_WIDGET":
      // Highlighting is now handled by SelectionOverlay in parent window
      break;
    default:
      console.warn("Preview Runtime: Unknown message type:", type);
  }
}

// Setup interaction handler for widget selection
function setupInteractionHandler() {
  document.addEventListener(
    "click",
    (event) => {
      // Don't intercept clicks on interactive elements - let them work normally
      const interactiveElement = event.target.closest('button, a, input, select, textarea, [role="button"]');
      if (interactiveElement) {
        // Still send selection message, but don't prevent the click
        const blockEl = event.target.closest("[data-block-id]");
        const widgetEl = event.target.closest("[data-widget-id]");
        if (widgetEl) {
          window.parent.postMessage(
            {
              type: "WIDGET_SELECTED",
              payload: {
                widgetId: widgetEl.getAttribute("data-widget-id"),
                blockId: blockEl ? blockEl.getAttribute("data-block-id") : null,
              },
            },
            "*",
          );
        }
        return; // Let the click proceed to the interactive element
      }

      // Find the closest widget or block element
      const blockEl = event.target.closest("[data-block-id]");
      const widgetEl = event.target.closest("[data-widget-id]");

      if (widgetEl) {
        // Prevent default behavior (e.g., following links) for non-interactive clicks
        event.preventDefault();
        event.stopPropagation();

        const widgetId = widgetEl.getAttribute("data-widget-id");
        const blockId = blockEl ? blockEl.getAttribute("data-block-id") : null;

        // Send message to parent
        window.parent.postMessage(
          {
            type: "WIDGET_SELECTED",
            payload: { widgetId, blockId },
          },
          "*",
        );
      }
    },
    true,
  ); // Use capture phase to ensure we catch it before other handlers
}

// Setup hover handler to send hover events to parent
let currentHoveredWidgetId = null;
let currentHoveredBlockId = null;

function reportHoverBounds() {
  if (!currentHoveredWidgetId) {
    window.parent.postMessage(
      {
        type: "WIDGET_HOVERED",
        payload: { widgetId: null, blockId: null, bounds: null, blockBounds: null },
      },
      "*",
    );
    return;
  }

  const widget = document.querySelector(`[data-widget-id="${currentHoveredWidgetId}"]`);
  let bounds = null;
  let blockBounds = null;

  if (widget) {
    const rect = widget.getBoundingClientRect();
    bounds = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };

    if (currentHoveredBlockId) {
      const block = widget.querySelector(`[data-block-id="${currentHoveredBlockId}"]`);
      if (block) {
        const blockRect = block.getBoundingClientRect();
        blockBounds = {
          top: blockRect.top,
          left: blockRect.left,
          width: blockRect.width,
          height: blockRect.height,
        };
      }
    }
  }

  window.parent.postMessage(
    {
      type: "WIDGET_HOVERED",
      payload: {
        widgetId: currentHoveredWidgetId,
        blockId: currentHoveredBlockId,
        bounds,
        blockBounds,
      },
    },
    "*",
  );
}

function setupHoverHandler() {
  document.addEventListener(
    "mouseover",
    (event) => {
      const blockEl = event.target.closest("[data-block-id]");
      const widgetEl = event.target.closest("[data-widget-id]");

      const widgetId = widgetEl?.getAttribute("data-widget-id") || null;
      const blockId = blockEl?.getAttribute("data-block-id") || null;

      // Only send if changed
      if (widgetId !== currentHoveredWidgetId || blockId !== currentHoveredBlockId) {
        currentHoveredWidgetId = widgetId;
        currentHoveredBlockId = blockId;
        reportHoverBounds();
      }
    },
    true,
  );

  // Clear hover when mouse leaves the document
  document.addEventListener(
    "mouseleave",
    () => {
      if (currentHoveredWidgetId !== null || currentHoveredBlockId !== null) {
        currentHoveredWidgetId = null;
        currentHoveredBlockId = null;
        reportHoverBounds();
      }
    },
    true,
  );
}

// ResizeObserver to detect widget size changes (e.g., accordion expansion)
let widgetResizeObserver = null;
let resizeDebounceTimer = null;

function observeWidgetResize(widgetId) {
  // Disconnect previous observer
  if (widgetResizeObserver) {
    widgetResizeObserver.disconnect();
  }

  if (!widgetId) return;

  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) return;

  widgetResizeObserver = new ResizeObserver(() => {
    // Debounce to avoid rapid-fire updates during animations
    if (resizeDebounceTimer) cancelAnimationFrame(resizeDebounceTimer);
    resizeDebounceTimer = requestAnimationFrame(() => {
      reportElementBounds(currentSelectedWidgetId, currentSelectedBlockId);
    });
  });

  // Observe the widget itself
  widgetResizeObserver.observe(widget);

  // Also observe all blocks within the widget for individual block size changes
  const blocks = widget.querySelectorAll("[data-block-id]");
  blocks.forEach((block) => {
    widgetResizeObserver.observe(block);
  });
}

// Initialize the preview runtime
function initializeRuntime() {
  setupInteractionHandler();
  setupHoverHandler();
  setupScrollBoundsReporting();
  window.addEventListener("message", handleMessage);

  // Notify parent that preview content is ready (wait for DOM to be fully parsed)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    });
  } else {
    // DOM already loaded
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
  }
}

// TODO: Implement safe widget initialization without eval()
function initializeWidget(widgetId) {
  console.log(`Widget ${widgetId} added - scripts may need manual initialization`);
}

// Create global runtime object
window.PreviewRuntime = {
  initializeRuntime,
  updateCssVariables,
  initializeWidget,
  scrollToWidget,
};

// Auto-initialize when the script loads
initializeRuntime();
