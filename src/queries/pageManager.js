import { apiFetchJson, rethrowQueryError } from "../lib/apiFetch";

/**
 * @typedef {Object} Page
 * @property {string} id - Unique page identifier
 * @property {string} title - Page title
 * @property {string} slug - URL-friendly page slug
 * @property {string} [template] - Template identifier
 * @property {Object} [content] - Page content/widget data
 * @property {Object} [metadata] - SEO and page metadata
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} updatedAt - ISO timestamp of last update
 */

/**
 * Fetch all pages for the active project.
 * @returns {Promise<Page[]>} Array of page objects
 * @throws {Error} If the API request fails
 */
export async function getAllPages() {
  try {
    return await apiFetchJson("/api/pages", {}, { fallbackMessage: "Failed to get pages" });
  } catch (error) {
    rethrowQueryError(error, "Failed to get pages");
  }
}

/**
 * Permanently delete a page by its ID.
 * @param {string} pageId - The ID of the page to delete
 * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
 * @throws {Error} If the page cannot be deleted
 */
export async function deletePage(pageId) {
  try {
    return await apiFetchJson(`/api/pages/${pageId}`, {
      method: "DELETE",
    }, { fallbackMessage: "Failed to delete page" });
  } catch (error) {
    rethrowQueryError(error, "Failed to delete page");
  }
}

/**
 * Delete multiple pages in a single operation.
 * @param {string[]} pageIds - Array of page IDs to delete
 * @returns {Promise<{success: boolean, deletedCount: number}>} Deletion result with count
 * @throws {Error} If the bulk delete operation fails
 */
export async function bulkDeletePages(pageIds) {
  try {
    return await apiFetchJson("/api/pages/bulk-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageIds }),
    }, { fallbackMessage: "Failed to bulk delete pages" });
  } catch (error) {
    rethrowQueryError(error, "Failed to bulk delete pages");
  }
}

/**
 * Fetch a specific page by its ID.
 * @param {string} id - The ID of the page to retrieve
 * @returns {Promise<Page>} The page object with full content
 * @throws {Error} If the page is not found or request fails
 */
export async function getPage(id) {
  try {
    return await apiFetchJson(`/api/pages/${id}`, {}, { fallbackMessage: "Failed to get page" });
  } catch (error) {
    console.error("Error getting page:", error);
    rethrowQueryError(error, "Failed to get page");
  }
}

/**
 * Update an existing page with new data.
 * @param {string} id - The ID of the page to update
 * @param {Object} pageData - The fields to update
 * @param {string} [pageData.title] - New page title
 * @param {string} [pageData.slug] - New URL slug
 * @param {string} [pageData.template] - New template identifier
 * @param {Object} [pageData.metadata] - Updated SEO metadata
 * @returns {Promise<Page>} The updated page object
 * @throws {Error} If the update fails or validation errors occur
 */
export async function updatePage(id, pageData) {
  try {
    return await apiFetchJson(`/api/pages/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    }, { fallbackMessage: "Failed to update page" });
  } catch (error) {
    console.error("Error updating page:", error);
    rethrowQueryError(error, "Failed to update page");
  }
}

/**
 * Create a new page in the active project.
 * @param {Object} pageData - The page configuration
 * @param {string} pageData.title - Page title (required)
 * @param {string} [pageData.slug] - URL slug (auto-generated from title if not provided)
 * @param {string} [pageData.template] - Template identifier
 * @param {Object} [pageData.content] - Initial page content
 * @param {Object} [pageData.metadata] - SEO metadata
 * @returns {Promise<Page>} The newly created page object
 * @throws {Error} If page creation fails
 */
export async function createPage(pageData) {
  try {
    return await apiFetchJson("/api/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    }, { fallbackMessage: "Failed to create page" });
  } catch (error) {
    rethrowQueryError(error, "Failed to create page");
  }
}

/**
 * Save page content from the visual page editor.
 * Persists widget configurations and layout data.
 * @param {string} pageId - The ID of the page to save
 * @param {Object} pageData - The page content data
 * @param {Object} pageData.content - Widget and layout configuration
 * @param {Object} [pageData.metadata] - Updated page metadata
 * @returns {Promise<{success: boolean, page: Page}>} Save confirmation with updated page
 * @throws {Error} If saving fails
 */
export async function savePageContent(pageId, pageData) {
  try {
    return await apiFetchJson(`/api/pages/${pageId}/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    }, { fallbackMessage: "Failed to save page content" });
  } catch (error) {
    if (error.code === "PROJECT_MISMATCH") throw error;
    console.error("Error saving page content:", error);
    rethrowQueryError(error, "Failed to save page content");
  }
}

/**
 * Create a duplicate copy of an existing page including all content.
 * @param {string} pageId - The ID of the page to duplicate
 * @returns {Promise<Page>} The newly created duplicate page
 * @throws {Error} If duplication fails
 */
export async function duplicatePage(pageId) {
  try {
    return await apiFetchJson(`/api/pages/${pageId}/duplicate`, {
      method: "POST",
    }, { fallbackMessage: "Failed to duplicate page" });
  } catch (error) {
    console.error("Error duplicating page:", error);
    rethrowQueryError(error, "Failed to duplicate page");
  }
}
