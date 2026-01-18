import { API_URL } from "../config";
import useProjectStore from "../stores/projectStore";
import fontDefinitions from "../core/config/fonts.json";

/**
 * Extract used fonts from theme settings with their weights
 */
function extractFonts(settings) {
  const fontsToLoad = {}; // { FontName: Set(weights) }
  if (!settings?.settings?.global?.typography) return {};

  const allFonts = [...fontDefinitions.system, ...fontDefinitions.google];

  settings.settings.global.typography.forEach((setting) => {
    if (setting.type === "font_picker" && setting.value) {
      const value = setting.value; // { stack, weight }
      if (value && typeof value === "object" && value.stack && value.weight) {
        const fontDef = allFonts.find((f) => f.stack === value.stack);
        if (fontDef && fontDef.isGoogleFont) {
          const fontName = fontDef.name;
          if (!fontsToLoad[fontName]) {
            fontsToLoad[fontName] = new Set();
          }
          fontsToLoad[fontName].add(value.weight);
        }
      }
    }
  });

  return fontsToLoad;
}

/**
 * Fetch a preview of the page from the server
 */
export async function fetchPreview(pageData, themeSettings, previewMode = "editor") {
  try {
    const response = await fetch(API_URL("/api/preview"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageData,
        themeSettings,
        previewMode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch preview");
    }

    return await response.text();
  } catch (error) {
    console.error("Preview fetch error:", error);
    throw error;
  }
}

/**
 * Fetch a rendered widget from the server
 */
export async function fetchRenderedWidget(widgetId, widget, themeSettings) {
  try {
    const response = await fetch(API_URL("/api/preview/widget"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetId,
        widget,
        themeSettings,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to render widget");
    }

    return await response.text();
  } catch (error) {
    console.error("Widget rendering error:", error);
    throw error;
  }
}

/**
 * The primary function to synchronize the preview iframe with the current application state.
 * This function is designed to be declarative. It compares the new state with the previous
 * state and performs the minimum necessary DOM manipulations to bring the iframe up to date.
 *
 * It handles:
 * - Adding, removing, and reordering widgets and their blocks.
 * - Updating the content of widgets when their settings or block structure changes.
 * - Applying global theme settings.
 * - Highlighting the selected widget/block and scrolling it into view.
 *
 * @param {HTMLIFrameElement} iframe The preview iframe element.
 * @param {object} newState The new, current state of the page from the stores.
 * @param {object} oldState The previous state of the page to compare against.
 */
export async function updatePreview(iframe, newState, oldState) {
  if (!iframe?.contentWindow || !newState || !oldState) {
    return;
  }
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  if (!iframeDoc.body) {
    // Body not ready, abort
    return;
  }

  const {
    widgets: newWidgets,
    globalWidgets: newGlobalWidgets,
    themeSettings: newThemeSettings,
    selectedWidgetId: newSelectedWidgetId,
    selectedGlobalWidgetId: newSelectedGlobalWidgetId,
    page: newPage,
  } = newState;

  const {
    widgets: oldWidgets,
    globalWidgets: oldGlobalWidgets,
    themeSettings: oldThemeSettings,
    page: oldPage,
  } = oldState;

  // --- 1. DETECT CHANGES ---

  const newWidgetOrder = newPage?.widgetsOrder || [];
  const oldWidgetOrder = oldPage?.widgetsOrder || [];

  const newWidgetIds = new Set(Object.keys(newWidgets || {}));
  const oldWidgetIds = new Set(Object.keys(oldWidgets || {}));

  const addedWidgetIds = [...newWidgetIds].filter((id) => !oldWidgetIds.has(id));
  const removedWidgetIds = [...oldWidgetIds].filter((id) => !newWidgetIds.has(id));
  const orderChanged = JSON.stringify(newWidgetOrder) !== JSON.stringify(oldWidgetOrder);

  // Find widgets whose settings or block structure have changed
  const changedWidgets = new Map();
  for (const id of newWidgetIds) {
    if (oldWidgetIds.has(id)) {
      const oldWidget = oldWidgets[id];
      const newWidget = newWidgets[id];
      const settingsChanged = JSON.stringify(oldWidget.settings) !== JSON.stringify(newWidget.settings);
      const blocksChanged = JSON.stringify(oldWidget.blocks) !== JSON.stringify(newWidget.blocks);
      const blockOrderChanged = JSON.stringify(oldWidget.blocksOrder) !== JSON.stringify(newWidget.blocksOrder);

      if (settingsChanged || blocksChanged || blockOrderChanged) {
        changedWidgets.set(id, { newWidget, oldWidget });
      }
    }
  }

  // Find changed global widgets
  if (
    newGlobalWidgets?.header &&
    JSON.stringify(newGlobalWidgets.header) !== JSON.stringify(oldGlobalWidgets?.header)
  ) {
    changedWidgets.set("header", { newWidget: newGlobalWidgets.header });
  }
  if (
    newGlobalWidgets?.footer &&
    JSON.stringify(newGlobalWidgets.footer) !== JSON.stringify(oldGlobalWidgets?.footer)
  ) {
    changedWidgets.set("footer", { newWidget: newGlobalWidgets.footer });
  }

  const themeSettingsChanged = JSON.stringify(newThemeSettings) !== JSON.stringify(oldThemeSettings);

  // If theme settings changed, we need to re-render ALL widgets because theme settings
  // might affect the HTML structure (not just CSS variables)
  if (themeSettingsChanged) {
    // Mark all page widgets as changed
    for (const id of newWidgetIds) {
      if (!changedWidgets.has(id)) {
        changedWidgets.set(id, { newWidget: newWidgets[id], oldWidget: oldWidgets[id] });
      }
    }
    // Mark global widgets as changed
    if (newGlobalWidgets?.header && !changedWidgets.has("header")) {
      changedWidgets.set("header", { newWidget: newGlobalWidgets.header });
    }
    if (newGlobalWidgets?.footer && !changedWidgets.has("footer")) {
      changedWidgets.set("footer", { newWidget: newGlobalWidgets.footer });
    }
  }

  // --- 2. PERFORM DOM UPDATES ---

  // Get the container for page widgets
  const contentContainer =
    iframeDoc.querySelector("[data-widgets-container]") || iframeDoc.querySelector("main") || iframeDoc.body;

  // Handle widget removals
  removedWidgetIds.forEach((widgetId) => {
    const el = iframeDoc.querySelector(`[data-widget-id="${widgetId}"]`);
    if (el) el.parentNode.removeChild(el);
  });

  // Handle widget additions and changes by re-rendering them
  const widgetsToUpdate = [...addedWidgetIds, ...changedWidgets.keys()];
  for (const widgetId of widgetsToUpdate) {
    const widgetData = newWidgets[widgetId] || newGlobalWidgets[widgetId];
    if (widgetData) {
      try {
        const renderedWidgetHtml = await fetchRenderedWidget(widgetId, widgetData, newThemeSettings);
        const tempDiv = iframeDoc.createElement("div");
        tempDiv.innerHTML = renderedWidgetHtml;
        const newElement = tempDiv.firstChild;

        const existingElement = iframeDoc.querySelector(`[data-widget-id="${widgetId}"]`);
        if (existingElement) {
          existingElement.parentNode.replaceChild(newElement, existingElement);
        } else if (newElement) {
          // This is a new widget, it will be placed by the reordering logic below
        }
      } catch (error) {
        console.error(`Error rendering widget ${widgetId}:`, error);
      }
    }
  }

  // Handle reordering if necessary
  if (orderChanged || addedWidgetIds.length > 0) {
    const pageWidgetElements = new Map();
    contentContainer.querySelectorAll("[data-widget-id]").forEach((el) => {
      const id = el.getAttribute("data-widget-id");
      if (id !== "header" && id !== "footer") {
        pageWidgetElements.set(id, el);
      }
    });

    // Detach all page widgets
    pageWidgetElements.forEach((el) => el.parentNode.removeChild(el));

    // Re-attach in the correct order
    const headerEl = iframeDoc.querySelector('[data-widget-id="header"]');
    const footerEl = iframeDoc.querySelector('[data-widget-id="footer"]');
    let lastAttachedElement = headerEl;

    // Use a for...of loop to handle async operations correctly
    for (const widgetId of newWidgetOrder) {
      let elementToInsert = pageWidgetElements.get(widgetId);

      // If it's a new widget, it wasn't in the DOM, so we need to render it now.
      if (!elementToInsert) {
        try {
          const widgetData = newWidgets[widgetId];
          if (widgetData) {
            const renderedWidgetHtml = await fetchRenderedWidget(widgetId, widgetData, newThemeSettings);
            const tempDiv = iframeDoc.createElement("div");
            tempDiv.innerHTML = renderedWidgetHtml;
            elementToInsert = tempDiv.firstChild;
          }
        } catch (error) {
          console.error(`Error rendering new widget ${widgetId} during reorder:`, error);
          continue; // continue to next widget
        }
      }

      if (!elementToInsert) continue;

      if (lastAttachedElement) {
        lastAttachedElement.insertAdjacentElement("afterend", elementToInsert);
      } else if (footerEl) {
        // If there's no header, insert before the footer
        footerEl.insertAdjacentElement("beforebegin", elementToInsert);
      } else {
        // If no header or footer, just append to the main container
        contentContainer.appendChild(elementToInsert);
      }
      lastAttachedElement = elementToInsert;
    }
  }

  // --- 3. APPLY STYLES & SELECTION ---

  // Update theme settings (CSS variables)
  if (themeSettingsChanged) {
    updateThemeSettings(iframe, newThemeSettings);
  }

  // Scroll to selected widget after DOM updates
  // Note: Highlighting is now handled by SelectionOverlay component
  setTimeout(() => {
    const finalSelectedWidgetId = newSelectedWidgetId || newSelectedGlobalWidgetId;
    if (finalSelectedWidgetId) {
      scrollWidgetIntoView(iframe, finalSelectedWidgetId);
    }
  }, 50);
}

/**
 * Convert a settings object to CSS variable format
 */
export function settingsToCssVariables(settings) {
  const variables = {};

  if (!settings || !settings.settings || !settings.settings.global) {
    return variables;
  }

  const { global } = settings.settings;

  // Process each category
  Object.entries(global).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      items.forEach((item) => {
        // Handle font_picker type specifically (always output, no outputAsCssVar check)
        if (item.type === "font_picker") {
          const value = item.value !== undefined ? item.value : item.default;
          // Ensure value is the expected object { stack, weight }
          if (value && typeof value === "object" && value.stack && value.weight !== undefined) {
            const cssVarBase = `--${category}-${item.id}`;
            variables[`${cssVarBase}-family`] = value.stack;
            variables[`${cssVarBase}-weight`] = value.weight;
          }
        }
        // Handle other types marked for CSS variable output
        else if (item.id && item.outputAsCssVar === true) {
          // Use value if present, otherwise use default
          let value = item.value !== undefined ? item.value : item.default;
          if (value !== undefined) {
            // For range inputs with units, append the unit to the value
            if (item.type === "range" && item.unit && typeof value === "number") {
              value = `${value}${item.unit}`;
            }
            // Construct the CSS variable name
            variables[`--${category}-${item.id}`] = value;
          }
        }
      });
    }
  });

  return variables;
}

/**
 * Update theme settings in the preview without reloading
 */
/**
 * Update theme settings in the preview without reloading
 */
function updateThemeSettings(iframe, settings) {
  if (!iframe?.contentWindow) {
    console.warn("Preview Manager: No iframe window available");
    return;
  }

  const variables = settingsToCssVariables(settings);
  const fontsMetadata = extractFonts(settings);

  iframe.contentWindow.postMessage(
    {
      type: "UPDATE_CSS_VARIABLES",
      payload: variables,
    },
    "*",
  );

  if (Object.keys(fontsMetadata).length > 0) {
    // Convert Set to Array for JSON serialization
    const fontsPayload = Object.fromEntries(
      Object.entries(fontsMetadata).map(([name, weightsSet]) => [name, Array.from(weightsSet)]),
    );
    iframe.contentWindow.postMessage(
      {
        type: "LOAD_FONTS",
        payload: fontsPayload,
      },
      "*",
    );
  }
}

// Note: highlightWidget and hoverWidget functions removed.
// Widget highlighting is now handled by the SelectionOverlay component
// in the parent window, not via iframe postMessage.

/**
 * Update a widget setting in the preview without reloading
 */
export function updateWidgetSetting(iframe, widgetId, settingId, value) {
  if (!iframe || !iframe.contentWindow) return false;

  // Use the runtime to update the widget setting
  if (iframe.contentWindow.PreviewRuntime) {
    return iframe.contentWindow.PreviewRuntime.updateWidgetSetting(widgetId, settingId, value);
  }

  return false;
}

/**
 * Get global widgets (header and footer)
 */
export async function getGlobalWidgets() {
  try {
    const response = await fetch(API_URL("/api/preview/global-widgets"));

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch global widgets");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching global widgets:", error);
    throw error;
  }
}

/**
 * Save a global widget
 */
export async function saveGlobalWidget(type, widget) {
  try {
    const response = await fetch(API_URL(`/api/preview/global-widgets/${type}`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(widget),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save global widget");
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving global widget:", error);
    throw error;
  }
}

/**
 * Get the project widgets
 */
export async function getProjectWidgets() {
  try {
    const activeProject = useProjectStore.getState().activeProject;

    if (!activeProject) {
      throw new Error("No active project");
    }

    const response = await fetch(API_URL(`/api/projects/${activeProject.id}/widgets`));

    if (!response.ok) {
      throw new Error("Failed to fetch project widgets");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting project widgets:", error);
    throw new Error("Failed to get project widgets");
  }
}

/**
 * Scroll a widget into view in the preview
 */
export function scrollWidgetIntoView(iframe, widgetId) {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(
    {
      type: "SCROLL_TO_WIDGET",
      payload: {
        widgetId,
      },
    },
    "*",
  );
}
