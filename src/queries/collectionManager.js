import { apiFetchJson, rethrowQueryError } from "../lib/apiFetch";

/**
 * Query client for collection schemas and items (Collections spec Section 10).
 * Mirrors pageManager.js: every call goes through apiFetchJson (which injects
 * the X-Project-Id header) and rethrows via rethrowQueryError so ApiError
 * instances keep their status/code for callers.
 *
 * @typedef {Object} CollectionSchema
 * @property {string} type
 * @property {string} displayName
 * @property {string} displayNamePlural
 * @property {string} icon
 * @property {boolean} hasItemPages
 * @property {boolean} [sortable]
 * @property {string} slugPrefix
 * @property {string} defaultSort
 * @property {Array<Object>} settings
 *
 * @typedef {Object} CollectionItem
 * @property {string} id
 * @property {string} slug
 * @property {string} uuid
 * @property {string} title
 * @property {Object} settings
 * @property {Object} [_archived] - values for fields no longer in the schema (kept on disk, not editable)
 * @property {boolean} invalid
 * @property {Array<{fieldId: string, reason: string}>} validationErrors
 * @property {string} created
 * @property {string} updated
 */

/**
 * Fetch all collection schemas for the active project.
 * @returns {Promise<CollectionSchema[]>}
 */
export async function getCollectionSchemas() {
  try {
    return await apiFetchJson("/api/collections/schemas", {}, { fallbackMessage: "Failed to get collections" });
  } catch (error) {
    rethrowQueryError(error, "Failed to get collections");
  }
}

/**
 * Fetch a single collection schema by type.
 * @param {string} type - Collection type slug
 * @returns {Promise<CollectionSchema>}
 */
export async function getCollectionSchema(type) {
  try {
    return await apiFetchJson(`/api/collections/schema/${type}`, {}, { fallbackMessage: "Failed to get collection" });
  } catch (error) {
    rethrowQueryError(error, "Failed to get collection");
  }
}

/**
 * Fetch all items for a collection type.
 * @param {string} type - Collection type slug
 * @param {Object} [params] - Optional query params (sort, limit, offset, invalid)
 * @returns {Promise<CollectionItem[]>}
 */
export async function getCollectionItems(type, params) {
  try {
    let path = `/api/collections/${type}`;
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          search.set(key, String(value));
        }
      }
      const query = search.toString();
      if (query) path += `?${query}`;
    }
    return await apiFetchJson(path, {}, { fallbackMessage: "Failed to get collection items" });
  } catch (error) {
    rethrowQueryError(error, "Failed to get collection items");
  }
}

/**
 * Fetch a single collection item by slug.
 * @param {string} type - Collection type slug
 * @param {string} slug - Item slug
 * @returns {Promise<CollectionItem>}
 */
export async function getCollectionItem(type, slug) {
  try {
    return await apiFetchJson(`/api/collections/${type}/${slug}`, {}, { fallbackMessage: "Failed to get item" });
  } catch (error) {
    rethrowQueryError(error, "Failed to get item");
  }
}

/**
 * Create a new collection item.
 * @param {string} type - Collection type slug
 * @param {Object} itemData - { slug, settings }
 * @returns {Promise<CollectionItem>}
 */
export async function createCollectionItem(type, itemData) {
  try {
    return await apiFetchJson(
      `/api/collections/${type}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      },
      { fallbackMessage: "Failed to create item" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to create item");
  }
}

/**
 * Update an existing collection item.
 * @param {string} type - Collection type slug
 * @param {string} slug - Current item slug
 * @param {Object} itemData - { slug, settings }
 * @returns {Promise<CollectionItem>}
 */
export async function updateCollectionItem(type, slug, itemData) {
  try {
    return await apiFetchJson(
      `/api/collections/${type}/${slug}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      },
      { fallbackMessage: "Failed to update item" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to update item");
  }
}

/**
 * Delete a collection item by slug.
 * @param {string} type - Collection type slug
 * @param {string} slug - Item slug
 * @returns {Promise<{success: boolean, slug: string}>}
 */
export async function deleteCollectionItem(type, slug) {
  try {
    return await apiFetchJson(
      `/api/collections/${type}/${slug}`,
      { method: "DELETE" },
      { fallbackMessage: "Failed to delete item" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to delete item");
  }
}

/**
 * Delete multiple collection items in one request.
 * @param {string} type - Collection type slug
 * @param {string[]} itemSlugs - Slugs to delete
 * @returns {Promise<{deleted: string[], notFound: string[], errors: Array}>}
 */
export async function bulkDeleteCollectionItems(type, itemSlugs) {
  try {
    return await apiFetchJson(
      `/api/collections/${type}/bulk-delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemSlugs }),
      },
      { fallbackMessage: "Failed to delete items" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to delete items");
  }
}

/**
 * Duplicate a collection item.
 * @param {string} type - Collection type slug
 * @param {string} slug - Item slug to duplicate
 * @returns {Promise<CollectionItem>}
 */
export async function duplicateCollectionItem(type, slug) {
  try {
    return await apiFetchJson(
      `/api/collections/${type}/${slug}/duplicate`,
      { method: "POST" },
      { fallbackMessage: "Failed to duplicate item" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to duplicate item");
  }
}

/**
 * Discard an item's archived (out-of-schema) settings. Removes the stored values
 * for fields no longer in the collection schema; returns the updated item (with
 * an empty `_archived`).
 * @param {string} type - Collection type slug
 * @param {string} slug - Item slug
 * @returns {Promise<CollectionItem>}
 */
export async function discardArchivedCollectionItem(type, slug) {
  try {
    return await apiFetchJson(
      `/api/collections/${type}/${slug}/discard-archived`,
      { method: "POST" },
      { fallbackMessage: "Failed to discard archived data" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to discard archived data");
  }
}

/**
 * Persist a new manual order for a collection's items.
 * @param {string} type - Collection type slug
 * @param {string[]} order - Slugs in the desired order
 * @returns {Promise<{success: boolean, order: string[]}>}
 */
export async function reorderCollectionItems(type, order) {
  try {
    return await apiFetchJson(
      `/api/collections/${type}/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      },
      { fallbackMessage: "Failed to reorder items" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to reorder items");
  }
}

/**
 * Render an (unsaved) collection item draft through its theme template and
 * return a short-lived preview token. Open `${API_URL}/render/${token}` to view.
 * @param {{collectionType: string, slug: string, settings: Object}} draft
 * @returns {Promise<{token: string}>}
 */
export async function previewCollectionItem(draft) {
  try {
    return await apiFetchJson(
      `/api/preview/collection`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
      { fallbackMessage: "Failed to build preview" },
    );
  } catch (error) {
    rethrowQueryError(error, "Failed to build preview");
  }
}
