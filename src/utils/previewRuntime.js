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

// Scroll to widget
function scrollToWidget(widgetId) {
  if (widgetId) {
    const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (widget) {
      widget.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }
}

// Update widget settings in real-time (for immediate feedback while typing)
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
  const elements = container.querySelectorAll(`[data-setting="${settingId}"]`);

  elements.forEach((el) => {
    // Check if this element belongs to a nested block (prevent bleeding)
    const closestBlock = el.closest("[data-block-id]");
    if (closestBlock && closestBlock !== container) {
      return;
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
function setupHoverHandler() {
  let lastHoveredWidget = null;
  let lastHoveredBlock = null;

  document.addEventListener(
    "mouseover",
    (event) => {
      const blockEl = event.target.closest("[data-block-id]");
      const widgetEl = event.target.closest("[data-widget-id]");

      const widgetId = widgetEl?.getAttribute("data-widget-id") || null;
      const blockId = blockEl?.getAttribute("data-block-id") || null;

      // Only send if changed
      if (widgetId !== lastHoveredWidget || blockId !== lastHoveredBlock) {
        lastHoveredWidget = widgetId;
        lastHoveredBlock = blockId;

        window.parent.postMessage(
          {
            type: "WIDGET_HOVERED",
            payload: { widgetId, blockId },
          },
          "*",
        );
      }
    },
    true,
  );

  // Clear hover when mouse leaves the document
  document.addEventListener(
    "mouseleave",
    () => {
      if (lastHoveredWidget !== null || lastHoveredBlock !== null) {
        lastHoveredWidget = null;
        lastHoveredBlock = null;
        window.parent.postMessage(
          {
            type: "WIDGET_HOVERED",
            payload: { widgetId: null, blockId: null },
          },
          "*",
        );
      }
    },
    true,
  );
}

// Initialize the preview runtime
function initializeRuntime() {
  setupInteractionHandler();
  setupHoverHandler();
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
