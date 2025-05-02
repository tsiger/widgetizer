import { API_URL } from "../config";

/**
 * Get all menus
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
 * Create a new menu
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
      const data = await response.json();
      throw new Error(data.error || "Failed to create menu");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating menu:", error);
    throw error;
  }
}

/**
 * Delete a menu by slug
 */
export async function deleteMenu(slug) {
  try {
    const response = await fetch(API_URL(`/api/menus/${slug}`), {
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
 * Get a menu by slug
 */
export async function getMenu(slug) {
  try {
    const response = await fetch(API_URL(`/api/menus/${slug}`));
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
 * Update a menu by slug
 */
export async function updateMenu(slug, menuData) {
  try {
    const response = await fetch(API_URL(`/api/menus/${slug}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData),
    });

    if (!response.ok) {
      throw new Error("Failed to update menu");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating menu:", error);
    throw error;
  }
}
