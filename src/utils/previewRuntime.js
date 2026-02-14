/*
This is the runtime script that is injected into the preview iframe.
It handles CSS variable updates, font loading, real-time settings updates,
click detection for widget selection, DOM morphing for widget updates,
and inline selection/hover overlay rendering.

The selection overlay is rendered inside the iframe to eliminate scroll lag
and cross-origin contentDocument access issues.
*/

// ── Origin-Aware PostMessage ────────────────────────────────────────────────

const BUILDER_ORIGIN =
  document.querySelector('script[src*="previewRuntime"]')?.dataset?.builderOrigin || "*";

function postToParent(data) {
  window.parent.postMessage(data, BUILDER_ORIGIN);
}

// ── Preview Mode ────────────────────────────────────────────────────────────

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

// ── CSS Variables + Fonts ───────────────────────────────────────────────────

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

// ── Selection + Scroll State ────────────────────────────────────────────────

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
    renderOverlay();
    return;
  }

  const documentHeight = document.documentElement.scrollHeight;
  let targetScroll = window.scrollY + rect.top - padding;
  const maxScroll = documentHeight - viewportHeight;
  targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

  window.scrollTo(0, targetScroll);

  requestAnimationFrame(() => {
    reportElementBounds(widgetId, currentSelectedBlockId);
    renderOverlay();
  });
}

function scrollToElement(widgetId, blockId = null) {
  if (!widgetId) return;

  currentSelectedWidgetId = widgetId;
  currentSelectedBlockId = blockId;
  observeWidgetResize(widgetId);

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

  // For blocks: check if fully visible. For widgets: check if top is visible.
  const isVisible = blockId
    ? rect.top >= padding && rect.bottom <= viewportHeight - padding
    : rect.top >= 0 && rect.top <= viewportHeight - padding;

  if (isVisible) {
    reportElementBounds(widgetId, blockId);
    renderOverlay();
    return;
  }

  const documentHeight = document.documentElement.scrollHeight;
  // Scroll so the top of the element is near the top of the viewport (with padding)
  let targetScroll = window.scrollY + rect.top - padding;
  const maxScroll = documentHeight - viewportHeight;
  targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

  window.scrollTo(0, targetScroll);

  requestAnimationFrame(() => {
    reportElementBounds(widgetId, blockId);
    renderOverlay();
  });
}

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

  postToParent({ type: "ELEMENT_BOUNDS", payload: { widgetId, blockId, bounds, blockBounds } });
}

// Scroll-triggered bounds reporting (debounced)
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
        renderOverlay();
      });
    },
    { passive: true },
  );
}

// ── Selection Update ────────────────────────────────────────────────────────

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

  renderOverlay();
}

// ── Real-Time Widget Settings ───────────────────────────────────────────────

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

function isHtmlContent(value) {
  if (typeof value !== "string") return false;
  return /<(p|strong|em|a|br|span|div)\b[^>]*>/i.test(value);
}

function applySettingToElement(container, settingId, value) {
  const childElements = [...container.querySelectorAll(`[data-setting="${settingId}"]`)];
  const elements = container.matches(`[data-setting="${settingId}"]`) ? [container, ...childElements] : childElements;

  elements.forEach((el) => {
    if (el !== container) {
      const closestBlock = el.closest("[data-block-id]");
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

// ── Hover State ─────────────────────────────────────────────────────────────

let currentHoveredWidgetId = null;
let currentHoveredBlockId = null;

// Sidebar hover (sent from parent)
let sidebarHoveredWidgetId = null;
let sidebarHoveredBlockId = null;

function reportHoverBounds() {
  if (!currentHoveredWidgetId) {
    postToParent({
      type: "WIDGET_HOVERED",
      payload: { widgetId: null, blockId: null, bounds: null, blockBounds: null },
    });
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

  postToParent({
    type: "WIDGET_HOVERED",
    payload: { widgetId: currentHoveredWidgetId, blockId: currentHoveredBlockId, bounds, blockBounds },
  });
}

function setupHoverHandler() {
  document.addEventListener(
    "mouseover",
    (event) => {
      // Ignore events on overlay elements
      if (event.target.closest("#wz-selection-overlay")) return;

      const blockEl = event.target.closest("[data-block-id]");
      const widgetEl = event.target.closest("[data-widget-id]");

      const widgetId = widgetEl?.getAttribute("data-widget-id") || null;
      const blockId = blockEl?.getAttribute("data-block-id") || null;

      if (widgetId !== currentHoveredWidgetId || blockId !== currentHoveredBlockId) {
        currentHoveredWidgetId = widgetId;
        currentHoveredBlockId = blockId;
        // Clear sidebar hover when preview hover is active
        sidebarHoveredWidgetId = null;
        sidebarHoveredBlockId = null;
        reportHoverBounds();
        renderOverlay();
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
        renderOverlay();
      }
    },
    true,
  );
}

// ── Interaction Handler (Click) ─────────────────────────────────────────────

function setupInteractionHandler() {
  document.addEventListener(
    "click",
    (event) => {
      // Ignore clicks on overlay elements (reorder buttons have pointer-events: auto)
      if (event.target.closest("#wz-selection-overlay")) return;

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
          postToParent({
            type: "WIDGET_SELECTED",
            payload: {
              widgetId: widgetEl.getAttribute("data-widget-id"),
              blockId: blockEl ? blockEl.getAttribute("data-block-id") : null,
            },
          });
        }
        return;
      }

      if (PREVIEW_MODE === "standalone") {
        return;
      }

      const interactiveElement = event.target.closest('button, input, select, textarea, [role="button"]');
      if (interactiveElement) {
        if (widgetEl) {
          postToParent({
            type: "WIDGET_SELECTED",
            payload: {
              widgetId: widgetEl.getAttribute("data-widget-id"),
              blockId: blockEl ? blockEl.getAttribute("data-block-id") : null,
            },
          });
        }
        return;
      }

      if (widgetEl) {
        event.preventDefault();
        event.stopPropagation();

        const widgetId = widgetEl.getAttribute("data-widget-id");
        const blockId = blockEl ? blockEl.getAttribute("data-block-id") : null;

        postToParent({ type: "WIDGET_SELECTED", payload: { widgetId, blockId } });
      }
    },
    true,
  );
}

// ── ResizeObserver ──────────────────────────────────────────────────────────

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
      renderOverlay();
    });
  });

  widgetResizeObserver.observe(widget);

  const blocks = widget.querySelectorAll("[data-block-id]");
  blocks.forEach((block) => {
    widgetResizeObserver.observe(block);
  });
}

// ── Widget Metadata (display names from parent) ─────────────────────────────

// Map of widgetId → displayName (sent from parent via SET_WIDGET_METADATA)
let widgetMetadata = {};

// ── Inline Selection Overlay ────────────────────────────────────────────────

const CHEVRON_UP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
const CHEVRON_DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

let overlayContainer = null;

function createOverlayContainer() {
  if (PREVIEW_MODE === "standalone") return null;

  const style = document.createElement("style");
  style.textContent = `
    .wz-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 99999; }
    .wz-selection-box { position: absolute; border: 2px solid #f472b6; box-shadow: 0 0 12px rgba(236,72,153,0.25); pointer-events: none; }
    .wz-hover-box { position: absolute; border: 1px solid #f9a8d4; background: rgba(236,72,153,0.05); pointer-events: none; }
    .wz-block-selection { position: absolute; border: 2px solid #60a5fa; box-shadow: 0 0 8px rgba(59,130,246,0.2); pointer-events: none; }
    .wz-block-hover { position: absolute; border: 1px solid #93c5fd; background: rgba(59,130,246,0.05); pointer-events: none; }
    .wz-widget-label { padding: 1px 8px; font-size: 11px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; background: #ec4899; border-radius: 4px; white-space: nowrap; pointer-events: none; line-height: 18px; }
    .wz-hover-label { position: absolute; transform: translateX(-50%); left: 50%; padding: 1px 6px; font-size: 11px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #db2777; background: #fce7f3; border-radius: 4px; white-space: nowrap; pointer-events: none; line-height: 18px; }
    .wz-reorder-btn { pointer-events: auto; padding: 2px; border-radius: 4px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; line-height: 0; }
    .wz-reorder-btn:hover { background: #fdf2f8; border-color: #f9a8d4; }
    .wz-reorder-btn[disabled] { opacity: 0.3; cursor: not-allowed; }
    .wz-reorder-btn[disabled]:hover { background: white; border-color: #e2e8f0; }
    .wz-controls { position: absolute; transform: translateX(-50%); left: 50%; display: flex; align-items: center; gap: 4px; pointer-events: auto; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "wz-overlay";
  overlay.id = "wz-selection-overlay";
  document.body.appendChild(overlay);
  return overlay;
}

// Widget order info (sent from parent via SET_WIDGET_METADATA)
let widgetOrder = []; // array of widgetIds in page order

function renderOverlay() {
  if (!overlayContainer) return;

  // Determine effective hover: preview hover takes priority over sidebar hover
  const hoverWidgetId = currentHoveredWidgetId || sidebarHoveredWidgetId;
  const hoverBlockId = currentHoveredWidgetId ? currentHoveredBlockId : sidebarHoveredBlockId;

  let html = "";

  // 1. Widget hover box (render first so selection appears on top)
  if (hoverWidgetId && hoverWidgetId !== currentSelectedWidgetId) {
    const hoverEl = document.querySelector(`[data-widget-id="${hoverWidgetId}"]`);
    if (hoverEl) {
      const rect = hoverEl.getBoundingClientRect();
      const displayName = widgetMetadata[hoverWidgetId] || "";
      html += `<div class="wz-hover-box" style="top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;">`;
      if (displayName) {
        html += `<div class="wz-hover-label" style="top:-22px;">${escapeHtml(displayName)}</div>`;
      }
      html += `</div>`;
    }
  }

  // 2. Block hover box
  if (hoverBlockId && hoverBlockId !== currentSelectedBlockId) {
    const targetWidgetId = hoverWidgetId || currentSelectedWidgetId;
    if (targetWidgetId) {
      const blockEl = document.querySelector(
        `[data-widget-id="${targetWidgetId}"] [data-block-id="${hoverBlockId}"]`,
      );
      if (blockEl) {
        const rect = blockEl.getBoundingClientRect();
        html += `<div class="wz-block-hover" style="top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;"></div>`;
      }
    }
  }

  // 3. Widget selection box
  if (currentSelectedWidgetId) {
    const selEl = document.querySelector(`[data-widget-id="${currentSelectedWidgetId}"]`);
    if (selEl) {
      const rect = selEl.getBoundingClientRect();
      const displayName = widgetMetadata[currentSelectedWidgetId] || "";
      const isPageWidget = widgetOrder.includes(currentSelectedWidgetId);
      const widgetIndex = widgetOrder.indexOf(currentSelectedWidgetId);
      const canMoveUp = isPageWidget && widgetIndex > 0;
      const canMoveDown = isPageWidget && widgetIndex < widgetOrder.length - 1;
      const showReorder = isPageWidget && widgetOrder.length > 1;

      html += `<div class="wz-selection-box" style="top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;">`;

      // Controls bar above the selection box
      html += `<div class="wz-controls" style="top:-24px;">`;

      if (showReorder) {
        html += `<button class="wz-reorder-btn" data-reorder="up" data-widget-reorder="${currentSelectedWidgetId}" ${!canMoveUp ? "disabled" : ""}>${CHEVRON_UP_SVG}</button>`;
      }

      if (displayName) {
        html += `<div class="wz-widget-label">${escapeHtml(displayName)}</div>`;
      }

      if (showReorder) {
        html += `<button class="wz-reorder-btn" data-reorder="down" data-widget-reorder="${currentSelectedWidgetId}" ${!canMoveDown ? "disabled" : ""}>${CHEVRON_DOWN_SVG}</button>`;
      }

      html += `</div>`; // .wz-controls
      html += `</div>`; // .wz-selection-box
    }
  }

  // 4. Block selection box
  if (currentSelectedWidgetId && currentSelectedBlockId) {
    const blockEl = document.querySelector(
      `[data-widget-id="${currentSelectedWidgetId}"] [data-block-id="${currentSelectedBlockId}"]`,
    );
    if (blockEl) {
      const rect = blockEl.getBoundingClientRect();
      html += `<div class="wz-block-selection" style="top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;"></div>`;
    }
  }

  overlayContainer.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Handle reorder button clicks via event delegation on the overlay
function setupOverlayClickHandler() {
  if (!overlayContainer) return;

  overlayContainer.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-widget-reorder]");
    if (!btn || btn.disabled) return;

    const widgetId = btn.getAttribute("data-widget-reorder");
    const direction = btn.getAttribute("data-reorder");

    postToParent({ type: "REORDER_WIDGET", payload: { widgetId, direction } });
  });
}

// ── Message Handler ─────────────────────────────────────────────────────────

function handleMessage(event) {
  // Origin check when isolation is enabled
  if (BUILDER_ORIGIN !== "*" && event.origin !== BUILDER_ORIGIN) return;

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
      renderOverlay();
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
    case "SET_WIDGET_METADATA":
      // payload: { metadata: { widgetId: displayName, ... }, widgetOrder: [...] }
      if (payload.metadata) {
        widgetMetadata = payload.metadata;
      }
      if (payload.widgetOrder) {
        widgetOrder = payload.widgetOrder;
      }
      renderOverlay();
      break;
    case "RESTORE_SCROLL":
      // Instantly restore scroll position (no smooth animation)
      window.scrollTo(0, payload.scrollY || 0);
      break;
    case "SIDEBAR_HOVER":
      // payload: { widgetId, blockId }
      sidebarHoveredWidgetId = payload.widgetId || null;
      sidebarHoveredBlockId = payload.blockId || null;
      // Clear preview hover when sidebar hover is active
      if (sidebarHoveredWidgetId) {
        currentHoveredWidgetId = null;
        currentHoveredBlockId = null;
      }
      renderOverlay();
      break;
    default:
      break;
  }
}

// ── Widget Morphing ─────────────────────────────────────────────────────────

const widgetTimers = new Map();
const widgetObservers = new Map();

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

function trackWidgetTimer(widgetId, timerId) {
  if (!widgetTimers.has(widgetId)) {
    widgetTimers.set(widgetId, new Set());
  }
  widgetTimers.get(widgetId).add(timerId);
}

function trackWidgetObserver(widgetId, observer) {
  if (!widgetObservers.has(widgetId)) {
    widgetObservers.set(widgetId, new Set());
  }
  widgetObservers.get(widgetId).add(observer);
}

function morphWidget(widgetId, newHtml) {
  const existingElement = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!existingElement) {
    console.warn(`[PreviewRuntime] Widget ${widgetId} not found for morphing`);
    return false;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(newHtml, "text/html");
    const newElement = doc.querySelector(`[data-widget-id="${widgetId}"]`);

    if (!newElement) {
      console.warn(`[PreviewRuntime] Widget ${widgetId} not found in new HTML`);
      return false;
    }

    const newScripts = extractScripts(newElement);
    newElement.querySelectorAll("script").forEach((script) => script.remove());

    preserveFormState(existingElement, newElement);
    cleanupWidget(widgetId);

    existingElement.parentNode.replaceChild(newElement, existingElement);

    if (newScripts.length > 0) {
      executeScripts(newScripts, newElement);
    }

    newElement.dataset.initialized = "true";
    newElement.dispatchEvent(new CustomEvent("widget:updated", { bubbles: true, detail: { widgetId } }));

    // Re-render overlay after morph (element positions may have changed)
    requestAnimationFrame(() => renderOverlay());

    return true;
  } catch (error) {
    console.error(`[PreviewRuntime] Error morphing widget ${widgetId}:`, error);
    return false;
  }
}

function preserveFormState(oldEl, newEl) {
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

function handleWidgetMorph(widgetId, newHtml) {
  console.log(`[Runtime] Received MORPH_WIDGET for: ${widgetId}`);
  const success = morphWidget(widgetId, newHtml);
  if (!success) {
    console.log(`[Runtime] Failed to morph widget: ${widgetId}`);
    postToParent({ type: "WIDGET_MORPH_FAILED", payload: { widgetId } });
  }
}

// ── Initialization ──────────────────────────────────────────────────────────

function initializeRuntime() {
  overlayContainer = createOverlayContainer();
  setupInteractionHandler();
  setupHoverHandler();
  setupScrollBoundsReporting();
  setupOverlayClickHandler();
  window.addEventListener("message", handleMessage);

  // Re-render overlay on window resize
  window.addEventListener("resize", () => renderOverlay());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      postToParent({ type: "PREVIEW_READY" });
    });
  } else {
    postToParent({ type: "PREVIEW_READY" });
  }
}

// Global runtime object
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
