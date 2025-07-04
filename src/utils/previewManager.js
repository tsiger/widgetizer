import { API_URL } from "../config";
import useProjectStore from "../stores/projectStore";

/**
 * Fetch a preview of the page from the server
 */
export async function fetchPreview(pageData, themeSettings) {
  try {
    const response = await fetch(API_URL("/api/preview"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageData,
        themeSettings,
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
 * Update a widget in the preview
 */
export async function updateWidget(iframe, widgetId, widget, selectedBlockId, themeSettings) {
  if (!iframe?.contentWindow) return false;

  try {
    // Render the updated widget with blocks and theme settings
    const renderedWidget = await fetchRenderedWidget(
      widgetId,
      {
        ...widget,
        blocks: widget.blocks || {},
        blocksOrder: widget.blocksOrder || [],
      },
      themeSettings,
    );

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return false;

    const existingWidget = iframeDoc.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!existingWidget) return false;

    // Create a temporary container
    const tempContainer = iframeDoc.createElement("div");
    tempContainer.innerHTML = renderedWidget;
    const newWidget = tempContainer.firstChild;

    // Replace the existing widget
    existingWidget.parentNode.replaceChild(newWidget, existingWidget);

    // Re-apply highlights after DOM update
    iframe.contentWindow.postMessage(
      {
        type: "HIGHLIGHT_WIDGET",
        payload: {
          widgetId,
          blockId: selectedBlockId,
        },
      },
      "*",
    );

    return true;
  } catch (error) {
    console.error("Widget update error:", error);
    return false;
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

  // Process each category
  Object.entries(global).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      items.forEach((item) => {
        if (item.id) {
          let value = item.value !== undefined ? item.value : item.default;
          // For range inputs with units, append the unit to the value
          if (item.type === "range" && item.unit && typeof value === "number") {
            value = `${value}${item.unit}`;
          }
          variables[`--${category}-${item.id}`] = value;
        }
      });
    }
  });

  return variables;
}

/**
 * Update theme settings in the preview without reloading
 */
export function updateThemeSettings(iframe, settings) {
  if (!iframe?.contentWindow) {
    console.warn("Preview Manager: No iframe window available");
    return;
  }

  iframe.contentWindow.postMessage(
    {
      type: "UPDATE_CSS_VARIABLES",
      payload: settings,
    },
    "*",
  );
}

/**
 * Highlight a widget in the preview
 */
export function highlightWidget(iframe, widgetId, blockId) {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(
    {
      type: "HIGHLIGHT_WIDGET",
      payload: {
        widgetId,
        blockId,
      },
    },
    "*",
  );
}

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
