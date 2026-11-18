import { editorFetchJson, rethrowQueryError } from "../lib/apiFetch";

/**
 * The limits that apply to the active project.
 * @returns {Promise<{ maxUploadBytes: number|null }>} `maxUploadBytes` is the largest single upload, or null for no limit
 * @throws {Error} If the API request fails
 */
export async function getProjectLimits() {
  try {
    return await editorFetchJson("/limits", {}, { expect: "object", fallbackMessage: "Failed to get limits" });
  } catch (error) {
    rethrowQueryError(error, "Failed to get limits");
  }
}
