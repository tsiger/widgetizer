import { editorFetchJson, rethrowQueryError } from "../lib/apiFetch";

const languageQuery = (language) => (language ? `?language=${encodeURIComponent(language)}` : "");

/**
 * Fetch a language's shared areas: the ones the theme declares (with their
 * content, empty when never saved) and the ones it no longer shows.
 * @param {string} [language]
 * @returns {Promise<{ declared: Array<{ id: string, label: string }>, retained: Array<{ id: string }>,
 *   areas: Record<string, { widgets: object, widgetsOrder: string[] }> }>}
 */
export async function getSharedAreas(language) {
  try {
    return await editorFetchJson(`/shared-areas${languageQuery(language)}`, {}, {
      fallbackMessage: "Failed to fetch shared areas",
    });
  } catch (error) {
    rethrowQueryError(error, "Failed to fetch shared areas");
  }
}

/**
 * Save one shared area of one language.
 * @param {string} areaId
 * @param {{ widgets: object, widgetsOrder: string[] }} area
 * @param {string} [language]
 */
export async function saveSharedArea(areaId, area, language) {
  try {
    return await editorFetchJson(
      `/shared-areas/${encodeURIComponent(areaId)}${languageQuery(language)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: area.widgets, widgetsOrder: area.widgetsOrder }),
      },
      { fallbackMessage: "Failed to save shared area" },
    );
  } catch (error) {
    if (error.code === "PROJECT_MISMATCH") throw error;
    rethrowQueryError(error, "Failed to save shared area");
  }
}
