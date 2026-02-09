/*
This is the runtime script that is injected into the preview iframe.
It handles CSS variable updates, font loading, real-time settings updates,
click detection for widget selection, and DOM morphing for widget updates.

Note: Widget highlighting is now handled by the SelectionOverlay component
in the parent window, not by this script.
*/

// Detect preview mode for link behavior
function getPreviewMode() {
  const script = document.querySelector('script[src*="previewRuntime.js"][data-preview-mode]');
  const mode = script?.dataset?.previewMode;
  return mode === "standalone" ? "standalone" : "editor";
}

const PREVIEW_MODE = getPreviewMode();

function getStandalonePreviewTarget(href) {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (trimmed.startsWith("#")) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http:") ||
    lower.startsWith("https:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    trimmed.startsWith("//")
  ) {
    return null;
  }

  const withoutQuery = trimmed.split("?")[0].split("#")[0];
  const previewMatch = withoutQuery.match(/^\/?preview\/([^/]+)$/);
  if (previewMatch) {
    return `/preview/${previewMatch[1]}`;
  }

  const htmlMatch = withoutQuery.match(/^\/?([^/]+)\.html$/);
  if (htmlMatch) {
    return `/preview/${htmlMatch[1]}`;
  }

  return null;
}

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
  observeWidgetResize(widgetId);

  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) {
    reportElementBounds(widgetId, currentSelectedBlockId);
    return;
  }

  const rect = widget.getBoundingClientRect();
  const padding = 40;
  const viewportHeight = window.innerHeight;
  const isFullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight;

  if (isFullyVisible) {
    reportElementBounds(widgetId, currentSelectedBlockId);
    return;
  }

  const documentHeight = document.documentElement.scrollHeight;
  let targetScroll = window.scrollY + rect.top - padding;
  const maxScroll = documentHeight - viewportHeight;
  targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

  window.scrollTo({ top: targetScroll, behavior: "smooth" });

  setTimeout(() => {
    reportElementBounds(widgetId, currentSelectedBlockId);
  }, 400);
}

// Scroll to widget or block and report bounds when done
function scrollToElement(widgetId, blockId = null) {
  if (!widgetId) return;

  currentSelectedWidgetId = widgetId;
  currentSelectedBlockId = blockId;
  observeWidgetResize(widgetId);

  // Find the target element: block if specified, otherwise widget
  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) {
    reportElementBounds(widgetId, blockId);
    return;
  }

  let targetElement = widget;
  if (blockId) {
    const block = widget.querySelector(`[data-block-id="${blockId}"]`);
    if (block) {
      targetElement = block;
    }
  }

  const rect = targetElement.getBoundingClientRect();
  const padding = 40;
  const viewportHeight = window.innerHeight;
  const isFullyVisible = rect.top >= padding && rect.bottom <= viewportHeight - padding;

  if (isFullyVisible) {
    reportElementBounds(widgetId, blockId);
    return;
  }

  const documentHeight = document.documentElement.scrollHeight;
  // Center the element in the viewport if possible
  let targetScroll = window.scrollY + rect.top - viewportHeight / 2 + rect.height / 2;
  const maxScroll = documentHeight - viewportHeight;
  targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

  window.scrollTo({ top: targetScroll, behavior: "smooth" });

  setTimeout(() => {
    reportElementBounds(widgetId, blockId);
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

  window.parent.postMessage({ type: "ELEMENT_BOUNDS", payload: { widgetId, blockId, bounds, blockBounds } }, "*");
}

// Report bounds on user scroll (debounced)
let scrollDebounceTimer = null;
function setupScrollBoundsReporting() {
  window.addEventListener(
    "scroll",
    () => {
      if (scrollDebounceTimer) cancelAnimationFrame(scrollDebounceTimer);
      scrollDebounceTimer = requestAnimationFrame(() => {
        if (currentSelectedWidgetId) {
          reportElementBounds(currentSelectedWidgetId, currentSelectedBlockId);
        }
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
  observeWidgetResize(widgetId);

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

// Check if a string value looks like HTML (richtext content)
function isHtmlContent(value) {
  if (typeof value !== "string") return false;
  // Check for common HTML tags from richtext editor
  return /<(p|strong|em|a|br|span|div)\b[^>]*>/i.test(value);
}

// Apply a setting value to elements within a container
function applySettingToElement(container, settingId, value) {
  const childElements = [...container.querySelectorAll(`[data-setting="${settingId}"]`)];
  const elements = container.matches(`[data-setting="${settingId}"]`) ? [container, ...childElements] : childElements;

  elements.forEach((el) => {
    if (el !== container) {
      const closestBlock = el.closest("[data-block-id]");
      // Skip only when the element belongs to a *nested* block (different block inside container).
      // Do not skip when closestBlock === el: the element itself has data-block-id (e.g. slideshow
      // headings), so we still update it.
      if (closestBlock && closestBlock !== container && closestBlock !== el) {
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
        // Use innerHTML for HTML content (richtext), textContent for plain text
        if (isHtmlContent(value)) {
          el.innerHTML = value;
        } else {
          el.textContent = value;
        }
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
    case "SCROLL_TO_ELEMENT":
      scrollToElement(payload.widgetId, payload.blockId);
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
    case "MORPH_WIDGET":
      handleWidgetMorph(payload.widgetId, payload.html);
      break;
    case "HIGHLIGHT_WIDGET":
    case "HOVER_WIDGET":
      // Legacy - handled by SelectionOverlay
      break;
    default:
      // Ignore unknown messages silently
      break;
  }
}

// Setup interaction handler for widget selection
function setupInteractionHandler() {
  document.addEventListener(
    "click",
    (event) => {
      const blockEl = event.target.closest("[data-block-id]");
      const widgetEl = event.target.closest("[data-widget-id]");

      const linkElement = event.target.closest("a");
      if (linkElement) {
        if (PREVIEW_MODE === "standalone") {
          const href = linkElement.getAttribute("href");
          if (href?.trim().startsWith("#")) {
            return;
          }

          const targetUrl = getStandalonePreviewTarget(href);
          event.preventDefault();
          event.stopPropagation();

          if (targetUrl) {
            window.top.location.assign(targetUrl);
          }
          return;
        }

        event.preventDefault();
        event.stopPropagation();

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
        return;
      }

      if (PREVIEW_MODE === "standalone") {
        return;
      }

      const interactiveElement = event.target.closest('button, input, select, textarea, [role="button"]');
      if (interactiveElement) {
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
        return;
      }

      if (widgetEl) {
        event.preventDefault();
        event.stopPropagation();

        const widgetId = widgetEl.getAttribute("data-widget-id");
        const blockId = blockEl ? blockEl.getAttribute("data-block-id") : null;

        window.parent.postMessage({ type: "WIDGET_SELECTED", payload: { widgetId, blockId } }, "*");
      }
    },
    true,
  );
}

// Setup hover handler to send hover events to parent
let currentHoveredWidgetId = null;
let currentHoveredBlockId = null;

function reportHoverBounds() {
  if (!currentHoveredWidgetId) {
    window.parent.postMessage(
      { type: "WIDGET_HOVERED", payload: { widgetId: null, blockId: null, bounds: null, blockBounds: null } },
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
      payload: { widgetId: currentHoveredWidgetId, blockId: currentHoveredBlockId, bounds, blockBounds },
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

      if (widgetId !== currentHoveredWidgetId || blockId !== currentHoveredBlockId) {
        currentHoveredWidgetId = widgetId;
        currentHoveredBlockId = blockId;
        reportHoverBounds();
      }
    },
    true,
  );

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

// ResizeObserver to detect widget size changes
let widgetResizeObserver = null;
let resizeDebounceTimer = null;

function observeWidgetResize(widgetId) {
  if (widgetResizeObserver) {
    widgetResizeObserver.disconnect();
  }

  if (!widgetId) return;

  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) return;

  widgetResizeObserver = new ResizeObserver(() => {
    if (resizeDebounceTimer) cancelAnimationFrame(resizeDebounceTimer);
    resizeDebounceTimer = requestAnimationFrame(() => {
      reportElementBounds(currentSelectedWidgetId, currentSelectedBlockId);
    });
  });

  widgetResizeObserver.observe(widget);

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    });
  } else {
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
  }
}

// Track widget timers and observers for cleanup
const widgetTimers = new Map();
const widgetObservers = new Map();

// Extract all script tags from an element
function extractScripts(element) {
  if (!element) return [];
  const scripts = Array.from(element.querySelectorAll("script"));
  return scripts.map((script) => ({
    type: script.type || "text/javascript",
    src: script.src || null,
    text: script.textContent || script.innerHTML || "",
    async: script.async,
    defer: script.defer,
  }));
}

// Execute scripts in order
function executeScripts(scripts, widgetElement) {
  if (!scripts || scripts.length === 0) return;

  scripts.forEach((scriptData) => {
    if (scriptData.src) {
      const script = document.createElement("script");
      script.type = scriptData.type;
      script.src = scriptData.src;
      if (scriptData.async) script.async = true;
      if (scriptData.defer) script.defer = true;
      const target = widgetElement || document.head;
      target.appendChild(script);
    } else if (scriptData.text) {
      try {
        const widgetId = widgetElement?.getAttribute("data-widget-id");
        const widget = widgetElement;
        const func = new Function("widget", "widgetId", "document", "window", scriptData.text);
        func(widget, widgetId, document, window);
      } catch (error) {
        console.error("[PreviewRuntime] Error executing script for widget:", error);
      }
    }
  });
}

// Initialize a widget's scripts and mark it as initialized
function initializeWidget(widgetId) {
  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) return;

  if (widget.dataset.initialized === "true") {
    return;
  }

  const scripts = extractScripts(widget);
  widget.querySelectorAll("script").forEach((script) => script.remove());

  executeScripts(scripts, widget);
  widget.dataset.initialized = "true";

  widget.dispatchEvent(new CustomEvent("widget:updated", { bubbles: true, detail: { widgetId } }));
}

// Cleanup widget state (timers, observers)
function cleanupWidget(widgetId) {
  const timers = widgetTimers.get(widgetId);
  if (timers) {
    timers.forEach((timerId) => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    widgetTimers.delete(widgetId);
  }

  const observers = widgetObservers.get(widgetId);
  if (observers) {
    observers.forEach((observer) => {
      if (observer.disconnect) observer.disconnect();
    });
    widgetObservers.delete(widgetId);
  }

  const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (widget) {
    widget.removeAttribute("data-initialized");
  }
}

// Track timer for a widget (for cleanup)
function trackWidgetTimer(widgetId, timerId) {
  if (!widgetTimers.has(widgetId)) {
    widgetTimers.set(widgetId, new Set());
  }
  widgetTimers.get(widgetId).add(timerId);
}

// Track observer for a widget (for cleanup)
function trackWidgetObserver(widgetId, observer) {
  if (!widgetObservers.has(widgetId)) {
    widgetObservers.set(widgetId, new Set());
  }
  widgetObservers.get(widgetId).add(observer);
}

// Simple widget morphing - replace the widget element and re-run scripts
// This is simpler and more reliable than complex DOM diffing
function morphWidget(widgetId, newHtml) {
  const existingElement = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!existingElement) {
    console.warn(`[PreviewRuntime] Widget ${widgetId} not found for morphing`);
    return false;
  }

  try {
    // Parse new HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(newHtml, "text/html");
    const newElement = doc.querySelector(`[data-widget-id="${widgetId}"]`);

    if (!newElement) {
      console.warn(`[PreviewRuntime] Widget ${widgetId} not found in new HTML`);
      return false;
    }

    // Extract scripts before replacing
    const newScripts = extractScripts(newElement);
    newElement.querySelectorAll("script").forEach((script) => script.remove());

    // Preserve some form state from old element
    preserveFormState(existingElement, newElement);

    // Cleanup old widget state
    cleanupWidget(widgetId);

    // Replace the element
    existingElement.parentNode.replaceChild(newElement, existingElement);

    // Execute scripts on the new element
    if (newScripts.length > 0) {
      executeScripts(newScripts, newElement);
    }

    // Mark as initialized
    newElement.dataset.initialized = "true";

    // Dispatch update event
    newElement.dispatchEvent(new CustomEvent("widget:updated", { bubbles: true, detail: { widgetId } }));

    return true;
  } catch (error) {
    console.error(`[PreviewRuntime] Error morphing widget ${widgetId}:`, error);
    return false;
  }
}

// Preserve form state from old element to new element
function preserveFormState(oldEl, newEl) {
  // Preserve input values
  const oldInputs = oldEl.querySelectorAll("input, textarea, select");
  oldInputs.forEach((oldInput) => {
    const name = oldInput.name || oldInput.id;
    if (!name) return;

    const newInput = newEl.querySelector(`[name="${name}"], #${name}`);
    if (!newInput) return;

    if (oldInput.type === "checkbox" || oldInput.type === "radio") {
      newInput.checked = oldInput.checked;
    } else if (oldInput.tagName === "SELECT") {
      newInput.value = oldInput.value;
    } else {
      newInput.value = oldInput.value;
    }
  });
}

// Handle widget morphing via postMessage
function handleWidgetMorph(widgetId, newHtml) {
  console.log(`[Runtime] 🔧 Received MORPH_WIDGET for: ${widgetId}`);
  const success = morphWidget(widgetId, newHtml);
  if (success) {
    console.log(`[Runtime] ✅ Successfully morphed widget: ${widgetId}`);
  } else {
    console.log(`[Runtime] ❌ Failed to morph widget: ${widgetId}`);
    window.parent.postMessage({ type: "WIDGET_MORPH_FAILED", payload: { widgetId } }, "*");
  }
}

// Create global runtime object
window.PreviewRuntime = {
  initializeRuntime,
  updateCssVariables,
  initializeWidget,
  scrollToWidget,
  morphWidget,
  cleanupWidget,
  trackWidgetTimer,
  trackWidgetObserver,
};

// Auto-initialize when the script loads
initializeRuntime();
