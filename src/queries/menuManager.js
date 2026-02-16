import { API_URL } from "../config";

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

/**
 * Fetch all menus for the active project.
 * @returns {Promise<Menu[]>} Array of menu objects
 * @throws {Error} If the API request fails
 */
export async function getAllMenus() {
  try {
    const response = await fetch(API_URL("/api/menus"));
    if (!response.ok) {
      throw new Error("Failed to fetch menus");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting menus:", error);
    throw new Error("Failed to get menus");
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
  try {
    const response = await fetch(API_URL("/api/menus"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle express-validator format: { errors: [{msg, param}, ...] }
      if (errorData.errors && Array.isArray(errorData.errors)) {
        throw new Error(errorData.errors.map((e) => e.msg).join("; "));
      }
      throw new Error(errorData.error || "Failed to create menu");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to create menu");
  }
}

/**
 * Permanently delete a menu by its ID.
 * @param {string} id - The ID of the menu to delete
 * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
 * @throws {Error} If the menu cannot be deleted
 */
export async function deleteMenu(id) {
  try {
    const response = await fetch(API_URL(`/api/menus/${id}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete menu");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting menu:", error);
    throw error;
  }
}

/**
 * Fetch a specific menu by its ID.
 * @param {string} id - The ID of the menu to retrieve
 * @returns {Promise<Menu>} The menu object with all items
 * @throws {Error} If the menu is not found or request fails
 */
export async function getMenu(id) {
  try {
    const response = await fetch(API_URL(`/api/menus/${id}`));
    if (!response.ok) {
      throw new Error("Failed to fetch menu");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting menu:", error);
    throw error;
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
    const response = await fetch(API_URL(`/api/menus/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle express-validator format: { errors: [{msg, param}, ...] }
      if (errorData.errors && Array.isArray(errorData.errors)) {
        throw new Error(errorData.errors.map((e) => e.msg).join("; "));
      }
      throw new Error(errorData.error || "Failed to update menu");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to update menu");
  }
}

/**
 * Create a duplicate copy of an existing menu including all items.
 * @param {string} id - The ID of the menu to duplicate
 * @returns {Promise<Menu>} The newly created duplicate menu
 * @throws {Error} If duplication fails
 */
export async function duplicateMenu(id) {
  try {
    const response = await fetch(API_URL(`/api/menus/${id}/duplicate`), {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to duplicate menu");
    }

    return await response.json();
  } catch (error) {
    console.error("Error duplicating menu:", error);
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error; // Re-throw with original message if it's our custom error
    }
    throw new Error("Failed to duplicate menu");
  }
}
