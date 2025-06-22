/*
This is the runtime script that is injected into the preview iframe.
It is used to update the CSS variables and highlight the widgets.
*/

// Initialize styles for widget highlighting
function initializeHighlightStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .widget-highlight {
      outline: 2px solid #0066cc;
      position: relative;
      box-shadow: 0 0 10px rgba(0, 102, 204, 0.3);
    }
    .block-highlight {
      outline: 2px solid #22c55e;
      position: relative;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    }
  `;
  document.head.appendChild(style);
}

// Handle CSS variable updates
function updateCssVariables(variables) {
  const root = document.documentElement;
  Object.entries(variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

// Handle widget highlighting
function highlightWidget(widgetId, blockId) {
  // Remove highlights from OTHER widgets (not the current one)
  document.querySelectorAll("[data-widget-id]").forEach((el) => {
    if (el.getAttribute("data-widget-id") !== widgetId) {
      el.classList.remove("widget-highlight");
    }
  });

  // Remove highlights from OTHER blocks (not the current one)
  document.querySelectorAll("[data-block-id]").forEach((el) => {
    if (el.getAttribute("data-block-id") !== blockId) {
      el.classList.remove("block-highlight");
    }
  });

  // Add/maintain widget highlight and scroll into view
  if (widgetId) {
    const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (widget) {
      if (!widget.classList.contains("widget-highlight")) {
        widget.classList.add("widget-highlight");
      }

      // Only scroll to widget if no block is selected
      if (!blockId) {
        widget.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }
  }

  // Add/maintain block highlight and scroll into view
  if (blockId) {
    const block = document.querySelector(`[data-block-id="${blockId}"]`);
    if (block) {
      if (!block.classList.contains("block-highlight")) {
        block.classList.add("block-highlight");
      }
      // Always scroll to block when selected
      block.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }
}

// Message handler
function handleMessage(event) {
  const { type, payload } = event.data;

  switch (type) {
    case "UPDATE_CSS_VARIABLES":
      updateCssVariables(payload);
      break;
    case "HIGHLIGHT_WIDGET":
      highlightWidget(payload.widgetId, payload.blockId);
      break;
    default:
      console.warn("Preview Runtime: Unknown message type:", type);
  }
}

// Initialize the preview runtime
function initializeRuntime() {
  initializeHighlightStyles();
  window.addEventListener("message", handleMessage);
}

// Create global runtime object
window.PreviewRuntime = {
  initializeRuntime,
  updateCssVariables,
  highlightWidget,
};

// Auto-initialize when the script loads
initializeRuntime();
