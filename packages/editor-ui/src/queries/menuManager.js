import { editorFetchJson, rethrowQueryError } from "../lib/apiFetch";

/**
 * @typedef {Object} MenuItem
 * @property {string} id - Unique menu item identifier
 * @property {string} label - Display label for the menu item
 * @property {string} [url] - URL or link target
 * @property {string} [pageId] - Reference to internal page
 * @property {MenuItem[]} [children] - Nested submenu items
 */

/**
 * @typedef {Object} Menu
 * @property {string} id - Unique menu identifier
 * @property {string} name - Menu name
 * @property {string} [location] - Menu location identifier (e.g., 'header', 'footer')
 * @property {MenuItem[]} items - Array of menu items
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} updatedAt - ISO timestamp of last update
 */

/** An id is unique per language, so reading or removing one has to name it. */
const languageQuery = (language) => (language ? `?language=${encodeURIComponent(language)}` : "");

/**
 * Fetch all menus for the active project.
 * @returns {Promise<Menu[]>} Array of menu objects
 * @throws {Error} If the API request fails
 */
export async function getAllMenus() {
  try {
    return await editorFetchJson("/menus", {}, { fallbackMessage: "Failed to get menus" });
  } catch (error) {
    console.error("Error getting menus:", error);
    rethrowQueryError(error, "Failed to get menus");
  }
}

/**
 * Create a new menu in the active project.
 * @param {Object} menuData - The menu configuration
 * @param {string} menuData.name - Menu name (required)
 * @param {string} [menuData.location] - Menu location identifier
 * @param {MenuItem[]} [menuData.items] - Initial menu items
 * @returns {Promise<Menu>} The newly created menu object
 * @throws {Error} If menu creation fails
 */
export async function createMenu(menuData) {
  // Create and update carry the language in the BODY, the way pages do: a menu
  // object holds its own `language`, so sending it back cannot address another.
  try {
    return await editorFetchJson("/menus", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData),
    }, { fallbackMessage: "Failed to create menu" });
  } catch (error) {
    rethrowQueryError(error, "Failed to create menu");
  }
}

/**
 * Permanently delete a menu by its ID.
 * @param {string} id - The ID of the menu to delete
 * @param {string} [language] - which language's menu
 * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
 * @throws {Error} If the menu cannot be deleted
 */
export async function deleteMenu(id, language) {
  try {
    return await editorFetchJson(`/menus/${id}${languageQuery(language)}`, {
      method: "DELETE",
    }, { fallbackMessage: "Failed to delete menu" });
  } catch (error) {
    console.error("Error deleting menu:", error);
    rethrowQueryError(error, "Failed to delete menu");
  }
}

/**
 * Fetch a specific menu by its ID.
 * @param {string} id - The ID of the menu to retrieve
 * @param {string} [language] - which language's menu
 * @returns {Promise<Menu>} The menu object with all items
 * @throws {Error} If the menu is not found or request fails
 */
export async function getMenu(id, language) {
  try {
    return await editorFetchJson(`/menus/${id}${languageQuery(language)}`, {}, { fallbackMessage: "Failed to get menu" });
  } catch (error) {
    console.error("Error getting menu:", error);
    rethrowQueryError(error, "Failed to get menu");
  }
}

/**
 * Update an existing menu with new data.
 * @param {string} id - The ID of the menu to update
 * @param {Object} menuData - The fields to update
 * @param {string} [menuData.name] - New menu name
 * @param {string} [menuData.location] - New menu location
 * @param {MenuItem[]} [menuData.items] - Updated menu items
 * @returns {Promise<Menu>} The updated menu object
 * @throws {Error} If the update fails
 */
export async function updateMenu(id, menuData) {
  try {
    return await editorFetchJson(`/menus/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData),
    }, { fallbackMessage: "Failed to update menu" });
  } catch (error) {
    rethrowQueryError(error, "Failed to update menu");
  }
}

/**
 * Create a duplicate copy of an existing menu including all items.
 * @param {string} id - The ID of the menu to duplicate
 * @param {string} [language] - which language's menu; the copy stays in it
 * @returns {Promise<Menu>} The newly created duplicate menu
 * @throws {Error} If duplication fails
 */
export async function duplicateMenu(id, language) {
  try {
    return await editorFetchJson(`/menus/${id}/duplicate${languageQuery(language)}`, {
      method: "POST",
    }, { fallbackMessage: "Failed to duplicate menu" });
  } catch (error) {
    console.error("Error duplicating menu:", error);
    rethrowQueryError(error, "Failed to duplicate menu");
  }
}
