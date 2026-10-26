import { editorFetch, editorFetchJson, rethrowQueryError, throwApiError } from "../lib/apiFetch";
import useProjectStore from "../stores/projectStore";
import useWidgetStore from "../stores/widgetStore";
import fontDefinitions from "@widgetizer/core/config/fonts.json" with { type: "json" };
import { getPreviewTargetOrigin } from "../lib/previewBase";
import { readThemeSetting, themeSettingsOfType } from "@widgetizer/core/themeSettingChanges";
import { changedThemeSettingPaths, readsDependOn } from "@widgetizer/core/themeReads";
import { collectThemeFonts, themeFontsStylesheetUrl } from "@widgetizer/core/themeFonts";

const ALL_FONTS_LIST = [...fontDefinitions.system, ...fontDefinitions.google];

/**
 * Fetch a preview token for src-based rendering.
 * @param {Object} pageData - Page content including widgets and metadata
 * @param {Object} themeSettings - Current theme settings for rendering
 * @param {string} [previewMode="editor"] - Preview mode
 * @returns {Promise<{token: string}>} Object with token property
 * @throws {Error} If the request fails
 */
export async function fetchPreviewToken(pageData, themeSettings, previewMode = "editor", pageNumber = 1) {
  try {
    return await editorFetchJson("/preview/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageData,
        themeSettings,
        previewMode,
        ...(pageNumber > 1 ? { pageNumber } : {}),
      }),
    }, { fallbackMessage: "Failed to create preview token" });
  } catch (error) {
    console.error("Preview token error:", error);
    rethrowQueryError(error, "Failed to create preview token");
  }
}

/**
 * Fetch a rendered HTML preview of the page from the server.
 * @param {Object} pageData - Page content including widgets and metadata
 * @param {Object} themeSettings - Current theme settings for rendering
 * @param {string} [previewMode="editor"] - Preview mode: "editor" includes editing overlay, "preview" is clean
 * @returns {Promise<string>} Rendered HTML string
 * @throws {Error} If the preview request fails
 */
export async function fetchPreview(pageData, themeSettings, previewMode = "editor") {
  try {
    const response = await editorFetch("/preview", {
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
      await throwApiError(response, "Failed to fetch preview");
    }

    return await response.text();
  } catch (error) {
    console.error("Preview fetch error:", error);
    rethrowQueryError(error, "Failed to fetch preview");
  }
}

/**
 * Fetch a single rendered widget HTML from the server.
 * Used for live preview updates without full page reload.
 * @param {string} widgetId - Unique widget identifier
 * @param {Object} widget - Widget data including type, settings, and blocks
 * @param {Object} themeSettings - Current theme settings for rendering
 * @param {string} [currentCanonicalPath] - Un-prefixed path of the page being
 *   previewed (e.g. "about.html"), so a morphed menu-bearing widget keeps its
 *   active-state (D3). Empty string when unknown.
 * @param {Object|null} [page] - The page being previewed, exposed to the widget
 *   as `page` the same way a full render does.
 * @returns {Promise<string>} Rendered widget HTML string
 * @throws {Error} If widget rendering fails
 */
export async function fetchRenderedWidget(widgetId, widget, themeSettings, currentCanonicalPath = "", page = null, area = null) {
  try {
    const response = await editorFetch("/preview/widget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetId,
        widget,
        themeSettings,
        currentCanonicalPath,
        page,
        ...(area ? { area } : {}),
      }),
    });

    if (!response.ok) {
      await throwApiError(response, "Failed to render widget");
    }

    return await response.text();
  } catch (error) {
    console.error("Widget rendering error:", error);
    rethrowQueryError(error, "Failed to render widget");
  }
}

// The site settings each widget and the layout read in the iframe's current
// document, kept per iframe: from PREVIEW_READY after a full render, then from
// each widget re-render.
const previewThemeReads = new WeakMap();

// Each call of updatePreview takes the next number; an update that finishes after
// a newer one started applies nothing, so an older render never lands on a newer one.
const previewGenerations = new WeakMap();

const RENDER_CONCURRENCY = 4;

/**
 * Record the reads a full render reported (the PREVIEW_READY payload).
 * @param {HTMLIFrameElement} iframe
 * @param {{ widgets?: Object<string, string[]>, layout?: string[] } | null} themeReads
 */
export function setPreviewThemeReads(iframe, themeReads) {
  if (!iframe) return;
  // A new document: an update still rendering for the old one must not morph into it,
  // and it already carries the custom code it was rendered with.
  previewGenerations.set(iframe, (previewGenerations.get(iframe) || 0) + 1);
  lastCustomCode.delete(iframe);
  previewThemeReads.set(iframe, {
    widgets: { ...(themeReads?.widgets || {}) },
    layout: Array.isArray(themeReads?.layout) ? themeReads.layout : null,
  });
}

/**
 * Make any update still rendering apply nothing, e.g. when an edit is undone
 * before it finished.
 * @param {HTMLIFrameElement} iframe
 */
export function invalidatePreviewUpdates(iframe) {
  if (iframe) previewGenerations.set(iframe, (previewGenerations.get(iframe) || 0) + 1);
}

async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Fetch a single rendered widget together with the site settings it read.
 * @returns {Promise<{ html: string, themeReads: string[] | null }>}
 */
export async function fetchRenderedWidgetWithReads(widgetId, widget, themeSettings, currentCanonicalPath = "", page = null, area = null) {
  const response = await editorFetch("/preview/widget", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      widgetId,
      widget,
      themeSettings,
      currentCanonicalPath,
      page,
      withThemeReads: true,
      ...(area ? { area } : {}),
    }),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to render widget");
  }

  const { html, themeReads } = await response.json();
  return { html, themeReads: Array.isArray(themeReads) ? themeReads : null };
}

/**
 * Update preview for CONTENT CHANGES ONLY (settings, blocks).
 * This function should NOT be called for structural changes (add/remove/reorder widgets).
 * Structural changes should trigger a full page reload instead.
 *
 * Flow:
 * 1. Apply changed site settings the runtime handles (CSS variables, fonts, classes) at once
 * 2. Find widgets whose content changed, plus those that read a changed site setting
 * 3. Render them in parallel and morph them in page order via MORPH_WIDGET
 *
 * @param {HTMLIFrameElement} iframe - Preview iframe element
 * @param {Object} newState - New page state with widgets, globalWidgets, themeSettings
 * @param {Object} [oldState] - Previous page state for comparison
 * @returns {Promise<{ stale?: boolean, needsReload?: boolean }>} `stale` when a newer
 *   update started meanwhile (nothing was applied); `needsReload` when the page
 *   layout reads a changed site setting, so only a full render shows it.
 */
export async function updatePreview(iframe, newState, oldState) {
  if (!iframe?.contentWindow || !newState) {
    return {};
  }

  const generation = (previewGenerations.get(iframe) || 0) + 1;
  previewGenerations.set(iframe, generation);
  const isCurrent = () => previewGenerations.get(iframe) === generation;

  const safeOldState = oldState || {};
  const { widgets: newWidgets = {}, globalWidgets: newGlobalWidgets = {}, themeSettings: newThemeSettings } = newState;

  // Un-prefixed path of the page being previewed, so a morphed menu-bearing
  // widget (header/footer) recomputes active-state by canonicalPath (D3).
  const currentCanonicalPath = `${newState.page?.slug || ""}.html`;

  const {
    widgets: oldWidgets = {},
    globalWidgets: oldGlobalWidgets = {},
    themeSettings: oldThemeSettings,
  } = safeOldState;

  const themeSettingsChanged = JSON.stringify(newThemeSettings) !== JSON.stringify(oldThemeSettings);
  if (themeSettingsChanged) {
    updateThemeSettings(iframe, newThemeSettings);
  }

  // The site settings whose rendered value changed; null when there is nothing to
  // compare with, which counts as every setting.
  const settingChanges = themeSettingsChanged && oldThemeSettings ? changedThemeSettingPaths(oldThemeSettings, newThemeSettings) : null;
  const reads = previewThemeReads.get(iframe) || { widgets: {}, layout: null };
  const readsChangedSetting = (widgetReads) =>
    themeSettingsChanged && (!settingChanges || readsDependOn(widgetReads, settingChanges));

  // The layout printed what it read into the document, so only a full render
  // updates it — even for a setting the runtime also applies as a variable.
  if (themeSettingsChanged && reads.layout && (!settingChanges || readsDependOn(reads.layout, settingChanges))) {
    return { needsReload: true };
  }

  // Find widgets whose content changed (settings, blocks, block order)
  const changedWidgetIds = [];
  for (const id of Object.keys(newWidgets)) {
    const oldWidget = oldWidgets[id];
    const newWidget = newWidgets[id];
    if (!oldWidget || !newWidget) continue;
    const settingsChanged = JSON.stringify(oldWidget.settings) !== JSON.stringify(newWidget.settings);
    const blocksChanged = JSON.stringify(oldWidget.blocks) !== JSON.stringify(newWidget.blocks);
    const blockOrderChanged = JSON.stringify(oldWidget.blocksOrder) !== JSON.stringify(newWidget.blocksOrder);
    if (settingsChanged || blocksChanged || blockOrderChanged || readsChangedSetting(reads.widgets[id])) {
      changedWidgetIds.push(id);
    }
  }

  const headerChanged =
    newGlobalWidgets?.header && JSON.stringify(newGlobalWidgets.header) !== JSON.stringify(oldGlobalWidgets?.header);
  const footerChanged =
    newGlobalWidgets?.footer && JSON.stringify(newGlobalWidgets.footer) !== JSON.stringify(oldGlobalWidgets?.footer);

  // A widget of a shared area renders knowing its area, as in the full render.
  const areaOf = (widgetId) =>
    Object.keys(newState.sharedAreas || {}).find((areaId) => newState.sharedAreas[areaId]?.widgets?.[widgetId]) || null;

  const jobs = changedWidgetIds.map((widgetId) => ({ widgetId, data: newWidgets[widgetId], area: areaOf(widgetId) }));
  if (newGlobalWidgets.header && (headerChanged || readsChangedSetting(reads.widgets.header))) {
    jobs.push({ widgetId: "header", data: newGlobalWidgets.header, area: null });
  }
  if (newGlobalWidgets.footer && (footerChanged || readsChangedSetting(reads.widgets.footer))) {
    jobs.push({ widgetId: "footer", data: newGlobalWidgets.footer, area: null });
  }

  const results = await mapWithConcurrency(jobs, RENDER_CONCURRENCY, async (job) => {
    try {
      return await fetchRenderedWidgetWithReads(
        job.widgetId,
        job.data,
        newThemeSettings,
        currentCanonicalPath,
        newState.page,
        job.area,
      );
    } catch (error) {
      console.error(`Error updating widget ${job.widgetId}:`, error);
      return null;
    }
  });

  if (!isCurrent()) return { stale: true };

  jobs.forEach((job, index) => {
    const result = results[index];
    if (!result) return;
    iframe.contentWindow.postMessage(
      { type: "MORPH_WIDGET", payload: { widgetId: job.widgetId, html: result.html } },
      getPreviewTargetOrigin(),
    );
    reads.widgets[job.widgetId] = result.themeReads;
  });
  previewThemeReads.set(iframe, reads);

  // Sync transparent-header body class when header settings change
  if (headerChanged) {
    const transparentOn = !!newGlobalWidgets.header?.settings?.transparent_on_hero;
    let shouldBeTransparent = false;

    if (transparentOn) {
      const widgetOrder = newState.page?.widgetsOrder || Object.keys(newWidgets);
      const firstWidgetId = widgetOrder[0];
      const firstWidget = firstWidgetId && newWidgets[firstWidgetId];
      if (firstWidget) {
        const schemas = useWidgetStore.getState().schemas;
        shouldBeTransparent = schemas[firstWidget.type]?.supportsTransparentHeader === true;
      }
    }

    iframe.contentWindow.postMessage(
      { type: "UPDATE_BODY_CLASS", payload: { className: "transparent-header", enabled: shouldBeTransparent } },
      getPreviewTargetOrigin(),
    );
  }

  return {};
}

/**
 * Convert theme settings to CSS custom properties (variables).
 * Processes typography font pickers and settings with outputAsCssVar flag.
 * @param {Object} settings - Theme settings object with global settings
 * @returns {Object<string, string>} Map of CSS variable names to values
 */
function settingsToCssVariables(settings) {
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

            if (item.id === "body_font") {
              if (value.weight === 400) {
                const fontInfo = ALL_FONTS_LIST.find((f) => f.stack === value.stack);
                if (fontInfo && fontInfo.isGoogleFont) {
                  const availableWeights = fontInfo.availableWeights || [];
                  let boldWeight = 700;
                  if (availableWeights.includes(700)) boldWeight = 700;
                  else if (availableWeights.includes(600)) boldWeight = 600;
                  else if (availableWeights.includes(500)) boldWeight = 500;
                  variables[`${cssVarBase}_bold-weight`] = boldWeight;
                }
              } else {
                variables[`${cssVarBase}_bold-weight`] = value.weight;
              }
            }
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
 * Update theme settings in the preview without reloading.
 * Sends CSS variables and font loading messages to the iframe.
 * @param {HTMLIFrameElement} iframe - Preview iframe element
 * @param {Object} settings - Theme settings to apply
 */
export function updateThemeSettings(iframe, settings) {
  if (!iframe?.contentWindow) {
    console.warn("Preview Manager: No iframe window available");
    return;
  }

  applyRuntimeThemeSettings(iframe, settings);

  // Debounce custom code (CSS / scripts) to avoid excessive re-execution; scripts
  // run again on every message, so unchanged code is not sent again.
  clearTimeout(customCodeTimer);
  customCodeTimer = setTimeout(() => {
    const { css, scripts } = extractCustomCode(settings);
    const sent = lastCustomCode.get(iframe) || {};
    const cssJson = JSON.stringify(css);
    const scriptsJson = JSON.stringify(scripts);
    if (cssJson !== sent.css) {
      iframe.contentWindow?.postMessage({ type: "UPDATE_CUSTOM_CSS", payload: css }, getPreviewTargetOrigin());
    }
    if (scriptsJson !== sent.scripts) {
      iframe.contentWindow?.postMessage({ type: "UPDATE_CUSTOM_SCRIPTS", payload: scripts }, getPreviewTargetOrigin());
    }
    lastCustomCode.set(iframe, { css: cssJson, scripts: scriptsJson });
  }, 300);
}

/**
 * Apply the site settings the preview runtime handles itself — CSS variables,
 * fonts and style classes — with no render. Custom code is left to
 * updateThemeSettings, which debounces it.
 * @param {HTMLIFrameElement} iframe
 * @param {Object} settings
 */
export function applyRuntimeThemeSettings(iframe, settings) {
  if (!iframe?.contentWindow) return;

  const variables = settingsToCssVariables(settings);
  const fontsUrl = themeFontsStylesheetUrl(collectThemeFonts(settings));

  iframe.contentWindow.postMessage({ type: "UPDATE_CSS_VARIABLES", payload: variables }, getPreviewTargetOrigin());

  if (fontsUrl) {
    iframe.contentWindow.postMessage({ type: "LOAD_FONTS", payload: { url: fontsUrl } }, getPreviewTargetOrigin());
  }

  const styleClasses = extractStyleClasses(settings);
  if (Object.keys(styleClasses).length > 0) {
    iframe.contentWindow.postMessage({ type: "UPDATE_STYLE_CLASSES", payload: styleClasses }, getPreviewTargetOrigin());
  }
}

/**
 * Extract style settings that map to body classes.
 * Maps setting IDs to their class prefix and current value.
 * @param {Object} settings - Theme settings object
 * @returns {Object<string, string>} Map of class prefix to value, e.g. { "corner": "rounded", "spacing": "airy" }
 */
const STYLE_CLASS_PREFIXES = {
  corner_style: "corner",
  spacing_density: "spacing",
  button_shape: "buttons",
};

function extractStyleClasses(settings) {
  const classes = {};
  for (const [id, prefix] of Object.entries(STYLE_CLASS_PREFIXES)) {
    const value = readThemeSetting(settings, { group: "style", id });
    if (value !== undefined) classes[prefix] = value;
  }
  return classes;
}

/**
 * Extract custom code settings (type: "code") from theme settings.
 * Categorises each by language into CSS or script entries.
 * @param {Object} settings - Theme settings object
 * @returns {{ css: Object<string, string>, scripts: Object<string, {html: string, placement: string}> }}
 */
function extractCustomCode(settings) {
  const css = {};
  const scripts = {};

  const codeSettings = themeSettingsOfType(settings, "code");
  const asString = (value) => (typeof value === "string" ? value : "");

  // Reserved ids go where their layout tag prints them, resolved as the tag resolves them.
  for (const [id, target] of Object.entries(RESERVED_CODE_TARGETS)) {
    if (!codeSettings.some((item) => item.id === id)) continue;
    const str = asString(readThemeSetting(settings, { group: "advanced", id }));
    if (target === "css") css[id] = str;
    else scripts[id] = { html: str, placement: target };
  }

  for (const item of codeSettings) {
    if (Object.hasOwn(RESERVED_CODE_TARGETS, item.id)) continue;
    const str = asString(item.value !== undefined ? item.value : item.default);

    if (item.language === "css") {
      css[item.id] = str;
    } else {
      // HTML / script settings — derive placement from id
      const placement = item.id.includes("head") ? "head" : "footer";
      scripts[item.id] = { html: str, placement };
    }
  }

  return { css, scripts };
}

const RESERVED_CODE_TARGETS = { custom_css: "css", custom_head_scripts: "head", custom_footer_scripts: "footer" };

let customCodeTimer = null;

// The custom code last sent to each preview document.
const lastCustomCode = new WeakMap();

/**
 * Fetch global widgets (header and footer) for the active project.
 * @param {string} [language] - which language's header/footer; each language has its own
 * @returns {Promise<{header: Object|null, footer: Object|null}>} Global widget data
 * @throws {Error} If the request fails
 */
export async function getGlobalWidgets(language) {
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  try {
    return await editorFetchJson(`/preview/global-widgets${query}`, {}, {
      fallbackMessage: "Failed to fetch global widgets",
    });
  } catch (error) {
    console.error("Error fetching global widgets:", error);
    rethrowQueryError(error, "Failed to fetch global widgets");
  }
}

/**
 * Save a global widget (header or footer) for the active project.
 * @param {string} type - Widget type: "header" or "footer"
 * @param {Object} widget - Widget data to save
 * @param {string} [language] - which language's header/footer; each language has its own
 * @returns {Promise<{success: boolean}>} Save confirmation
 * @throws {Error} If save fails
 */
export async function saveGlobalWidget(type, widget, language) {
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  try {
    return await editorFetchJson(`/preview/global-widgets/${type}${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(widget),
    }, { fallbackMessage: "Failed to save global widget" });
  } catch (error) {
    if (error.code === "PROJECT_MISMATCH") throw error;
    console.error("Error saving global widget:", error);
    rethrowQueryError(error, "Failed to save global widget");
  }
}

/**
 * Fetch all widget schemas available for the active project.
 * Includes both core and theme-specific widgets.
 * @returns {Promise<Array<Object>>} Array of widget schema definitions
 * @throws {Error} If no active project or request fails
 */
export async function getProjectWidgets(language) {
  const activeProject = useProjectStore.getState().activeProject;

  if (!activeProject) {
    throw new Error("No active project");
  }

  try {
    // A setting's default can be one of the theme's own words, which differs per
    // language, so the schemas are fetched for the language being edited.
    const query = language ? `?language=${encodeURIComponent(language)}` : "";
    return await editorFetchJson(`/widgets${query}`, {}, {
      fallbackMessage: "Failed to get project widgets",
    });
  } catch (error) {
    console.error("Error getting project widgets:", error);
    rethrowQueryError(error, "Failed to get project widgets");
  }
}

/**
 * Scroll a widget or block into view in the preview iframe.
 * If blockId is provided, scrolls to the block; otherwise scrolls to the widget.
 * @param {HTMLIFrameElement} iframe - Preview iframe element
 * @param {string} widgetId - Widget identifier
 * @param {string|null} blockId - Optional block identifier to scroll to
 */
export function scrollElementIntoView(iframe, widgetId, blockId = null) {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage({ type: "SCROLL_TO_ELEMENT", payload: { widgetId, blockId } }, getPreviewTargetOrigin());
}
