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
 * Update preview for CONTENT CHANGES ONLY (settings, blocks).
 * This function should NOT be called for structural changes (add/remove/reorder widgets).
 * Structural changes should trigger a full page reload instead.
 *
 * Flow:
 * 1. Find widgets whose content changed
 * 2. Morph those widgets via MORPH_WIDGET message
 * 3. Update theme CSS variables if changed
 */
export async function updatePreview(iframe, newState, oldState) {
  if (!iframe?.contentWindow || !newState) {
    return;
  }

  const safeOldState = oldState || {};
  const {
    widgets: newWidgets = {},
    globalWidgets: newGlobalWidgets = {},
    themeSettings: newThemeSettings,
  } = newState;

  const {
    widgets: oldWidgets = {},
    globalWidgets: oldGlobalWidgets = {},
    themeSettings: oldThemeSettings,
  } = safeOldState;

  // Find widgets whose content changed (settings, blocks, block order)
  const changedWidgetIds = [];
  const newWidgetIds = new Set(Object.keys(newWidgets));
  const oldWidgetIds = new Set(Object.keys(oldWidgets));

  for (const id of newWidgetIds) {
    if (oldWidgetIds.has(id)) {
      const oldWidget = oldWidgets[id];
      const newWidget = newWidgets[id];
      if (oldWidget && newWidget) {
        const settingsChanged = JSON.stringify(oldWidget.settings) !== JSON.stringify(newWidget.settings);
        const blocksChanged = JSON.stringify(oldWidget.blocks) !== JSON.stringify(newWidget.blocks);
        const blockOrderChanged = JSON.stringify(oldWidget.blocksOrder) !== JSON.stringify(newWidget.blocksOrder);
        if (settingsChanged || blocksChanged || blockOrderChanged) {
          changedWidgetIds.push(id);
        }
      }
    }
  }

  // Check global widgets
  const headerChanged =
    newGlobalWidgets?.header &&
    JSON.stringify(newGlobalWidgets.header) !== JSON.stringify(oldGlobalWidgets?.header);
  const footerChanged =
    newGlobalWidgets?.footer &&
    JSON.stringify(newGlobalWidgets.footer) !== JSON.stringify(oldGlobalWidgets?.footer);

  const themeSettingsChanged = JSON.stringify(newThemeSettings) !== JSON.stringify(oldThemeSettings);

  // Morph changed widgets
  console.log("[PreviewManager] Morphing widgets:", changedWidgetIds);
  for (const widgetId of changedWidgetIds) {
    const widgetData = newWidgets[widgetId];
    if (widgetData) {
      try {
        console.log(`[PreviewManager] → Morphing widget: ${widgetId}`);
        const renderedHtml = await fetchRenderedWidget(widgetId, widgetData, newThemeSettings);
        iframe.contentWindow.postMessage(
          { type: "MORPH_WIDGET", payload: { widgetId, html: renderedHtml } },
          "*",
        );
      } catch (error) {
        console.error(`Error updating widget ${widgetId}:`, error);
      }
    }
  }

  // Update global widgets if changed
  if (headerChanged && newGlobalWidgets.header) {
    try {
      const renderedHtml = await fetchRenderedWidget("header", newGlobalWidgets.header, newThemeSettings);
      iframe.contentWindow.postMessage(
        { type: "MORPH_WIDGET", payload: { widgetId: "header", html: renderedHtml } },
        "*",
      );
    } catch (error) {
      console.error("Error updating header:", error);
    }
  }
  if (footerChanged && newGlobalWidgets.footer) {
    try {
      const renderedHtml = await fetchRenderedWidget("footer", newGlobalWidgets.footer, newThemeSettings);
      iframe.contentWindow.postMessage(
        { type: "MORPH_WIDGET", payload: { widgetId: "footer", html: renderedHtml } },
        "*",
      );
    } catch (error) {
      console.error("Error updating footer:", error);
    }
  }

  // Update theme CSS variables if changed
  if (themeSettingsChanged) {
    updateThemeSettings(iframe, newThemeSettings);
  }
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

  Object.entries(global).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      items.forEach((item) => {
        if (item.type === "font_picker") {
          const value = item.value !== undefined ? item.value : item.default;
          if (value && typeof value === "object" && value.stack && value.weight !== undefined) {
            const cssVarBase = `--${category}-${item.id}`;
            variables[`${cssVarBase}-family`] = value.stack;
            variables[`${cssVarBase}-weight`] = value.weight;
          }
        } else if (item.id && item.outputAsCssVar === true) {
          let value = item.value !== undefined ? item.value : item.default;
          if (value !== undefined) {
            if (item.type === "range" && item.unit && typeof value === "number") {
              value = `${value}${item.unit}`;
            }
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
function updateThemeSettings(iframe, settings) {
  if (!iframe?.contentWindow) {
    console.warn("Preview Manager: No iframe window available");
    return;
  }

  const variables = settingsToCssVariables(settings);
  const fontsMetadata = extractFonts(settings);

  iframe.contentWindow.postMessage({ type: "UPDATE_CSS_VARIABLES", payload: variables }, "*");

  if (Object.keys(fontsMetadata).length > 0) {
    const fontsPayload = Object.fromEntries(
      Object.entries(fontsMetadata).map(([name, weightsSet]) => [name, Array.from(weightsSet)]),
    );
    iframe.contentWindow.postMessage({ type: "LOAD_FONTS", payload: fontsPayload }, "*");
  }
}

/**
 * Update a widget setting in the preview without reloading
 */
export function updateWidgetSetting(iframe, widgetId, settingId, value) {
  if (!iframe || !iframe.contentWindow) return false;

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

  iframe.contentWindow.postMessage({ type: "SCROLL_TO_WIDGET", payload: { widgetId } }, "*");
}
