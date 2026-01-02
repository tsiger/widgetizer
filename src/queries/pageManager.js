import { API_URL } from "../config";

/**
 * Get all pages
 */
export async function getAllPages() {
  try {
    const response = await fetch(API_URL("/api/pages"));
    if (!response.ok) {
      throw new Error("Failed to fetch pages");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to get pages");
  }
}

/**
 * Delete a page
 */
export async function deletePage(pageId) {
  try {
    const response = await fetch(API_URL(`/api/pages/${pageId}`), {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete page");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to delete page");
  }
}

/**
 * Bulk delete pages
 */
export async function bulkDeletePages(pageIds) {
  try {
    const response = await fetch(API_URL("/api/pages/bulk-delete"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to bulk delete pages");
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to bulk delete pages: ${error.message}`);
  }
}

/**
 * Get a specific page by ID
 */
export async function getPage(id) {
  try {
    const response = await fetch(API_URL(`/api/pages/${id}`));
    if (!response.ok) {
      throw new Error("Failed to fetch page");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting page:", error);
    throw new Error("Failed to get page");
  }
}

/**
 * Update an existing page
 */
export async function updatePage(id, pageData) {
  try {
    const response = await fetch(API_URL(`/api/pages/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || "Failed to update page");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating page:", error);
    throw error; // Re-throw the original error with its message
  }
}

/**
 * Create a new page
 */
export async function createPage(pageData) {
  try {
    const response = await fetch(API_URL("/api/pages"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      throw new Error("Failed to create page");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating page:", error);
    throw new Error("Failed to create page");
  }
}

/**
 * Save page content from the page editor
 */
export async function savePageContent(pageId, pageData) {
  try {
    const response = await fetch(API_URL(`/api/pages/${pageId}/content`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save page content");
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving page content:", error);
    throw new Error(`Failed to save page content: ${error.message}`);
  }
}

/**
 * Duplicate an existing page
 */
export async function duplicatePage(pageId) {
  try {
    const response = await fetch(API_URL(`/api/pages/${pageId}/duplicate`), {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to duplicate page");
    }

    return await response.json();
  } catch (error) {
    console.error("Error duplicating page:", error);
    throw new Error("Failed to duplicate page");
  }
}
