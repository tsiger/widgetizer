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

/**
 * Add a new widget to the preview at the specified position
 */
export async function addWidgetToPreview(iframe, widgetId, widget, position, themeSettings) {
  if (!iframe?.contentWindow) return false;

  try {
    // Render the new widget
    const renderedWidget = await fetchRenderedWidget(widgetId, widget, themeSettings);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return false;

    // Find the main content container where widgets are rendered
    // Based on the theme layout, widgets are typically in .container div
    const contentContainer =
      iframeDoc.querySelector(".container") ||
      iframeDoc.querySelector("[data-widgets-container]") ||
      iframeDoc.querySelector("main") ||
      iframeDoc.body;

    if (!contentContainer) return false;

    // Create the new widget element
    const tempContainer = iframeDoc.createElement("div");
    tempContainer.innerHTML = renderedWidget;
    const newWidget = tempContainer.firstChild;

    // Get only PAGE widgets (exclude global widgets like header/footer)
    // Global widgets have data-widget-id="header" or "footer"
    const pageWidgets = Array.from(contentContainer.querySelectorAll("[data-widget-id]")).filter((element) => {
      const widgetId = element.getAttribute("data-widget-id");
      return widgetId !== "header" && widgetId !== "footer";
    });

    // If no page widgets exist yet, we need to insert after header (if it exists) or at the beginning
    if (pageWidgets.length === 0) {
      const headerWidget = contentContainer.querySelector('[data-widget-id="header"]');
      if (headerWidget) {
        // Insert after header
        headerWidget.insertAdjacentElement("afterend", newWidget);
      } else {
        // No header, insert at the beginning
        contentContainer.insertBefore(newWidget, contentContainer.firstChild);
      }
    } else {
      // Insert at the specified position among page widgets
      if (position >= pageWidgets.length) {
        // Add to the end (before footer if it exists)
        const footerWidget = contentContainer.querySelector('[data-widget-id="footer"]');
        if (footerWidget) {
          footerWidget.insertAdjacentElement("beforebegin", newWidget);
        } else {
          contentContainer.appendChild(newWidget);
        }
      } else {
        // Insert before the widget at the specified position
        const insertBeforeWidget = pageWidgets[position];
        contentContainer.insertBefore(newWidget, insertBeforeWidget);
      }
    }

    // Initialize any scripts in the new widget
    if (iframe.contentWindow && typeof iframe.contentWindow.PreviewRuntime !== "undefined") {
      iframe.contentWindow.PreviewRuntime.initializeWidget(widgetId);
    }

    return true;
  } catch (error) {
    console.error("Widget add error:", error);
    return false;
  }
}

/**
 * Remove a widget from the preview
 */
export function removeWidgetFromPreview(iframe, widgetId) {
  if (!iframe?.contentWindow) return false;

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return false;

    const widgetElement = iframeDoc.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!widgetElement) return false;

    // Add a smooth fade-out animation
    widgetElement.style.transition = "opacity 0.2s ease-out, transform 0.2s ease-out";
    widgetElement.style.opacity = "0";
    widgetElement.style.transform = "scale(0.95)";

    // Remove after animation
    setTimeout(() => {
      if (widgetElement.parentNode) {
        widgetElement.parentNode.removeChild(widgetElement);
      }
    }, 200);

    return true;
  } catch (error) {
    console.error("Widget remove error:", error);
    return false;
  }
}

/**
 * Reorder widgets in the preview
 */
export function reorderWidgetsInPreview(iframe, newOrder) {
  if (!iframe?.contentWindow) return false;

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return false;

    // Find the main content container where widgets are rendered
    const contentContainer =
      iframeDoc.querySelector(".container") ||
      iframeDoc.querySelector("[data-widgets-container]") ||
      iframeDoc.querySelector("main") ||
      iframeDoc.body;

    if (!contentContainer) return false;

    // Get only PAGE widgets (exclude global widgets like header/footer)
    const pageWidgetElements = new Map();
    const allWidgets = contentContainer.querySelectorAll("[data-widget-id]");

    // Separate page widgets from global widgets
    const globalWidgets = { header: null, footer: null };

    allWidgets.forEach((element) => {
      const widgetId = element.getAttribute("data-widget-id");
      if (widgetId === "header") {
        globalWidgets.header = element;
      } else if (widgetId === "footer") {
        globalWidgets.footer = element;
      } else {
        // This is a page widget
        pageWidgetElements.set(widgetId, element);
      }
    });

    // Remove only page widgets from the container (keep global widgets in place)
    pageWidgetElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    // Re-add page widgets in the new order
    // Insert after header (if it exists) or before footer (if it exists)
    const headerWidget = globalWidgets.header;
    const footerWidget = globalWidgets.footer;

    newOrder.forEach((widgetId, index) => {
      const element = pageWidgetElements.get(widgetId);
      if (element) {
        if (index === 0 && headerWidget) {
          // First widget goes after header
          headerWidget.insertAdjacentElement("afterend", element);
        } else if (footerWidget) {
          // Insert before footer
          footerWidget.insertAdjacentElement("beforebegin", element);
        } else {
          // No footer, append to container
          contentContainer.appendChild(element);
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Widget reorder error:", error);
    return false;
  }
}

/**
 * Detect structural changes between widget sets
 */
export function detectWidgetChanges(currentWidgets, previousWidgets, currentOrder, previousOrder) {
  const currentIds = new Set(Object.keys(currentWidgets || {}));
  const previousIds = new Set(Object.keys(previousWidgets || {}));

  // Detect added widgets
  const addedWidgets = [...currentIds].filter((id) => !previousIds.has(id));

  // Detect removed widgets
  const removedWidgets = [...previousIds].filter((id) => !currentIds.has(id));

  // Detect if order changed
  const orderChanged = JSON.stringify(currentOrder) !== JSON.stringify(previousOrder);

  return {
    addedWidgets,
    removedWidgets,
    orderChanged: orderChanged && addedWidgets.length === 0 && removedWidgets.length === 0,
  };
}
