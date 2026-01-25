import { v4 as uuidv4 } from "uuid";

// Generate a unique ID
export const generateId = () => `item-${uuidv4()}`;

// Ensure all items have IDs
export const ensureIds = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item) => {
    const newItem = { ...item };
    if (!newItem.id) {
      newItem.id = generateId();
    }
    if (newItem.items && Array.isArray(newItem.items) && newItem.items.length > 0) {
      newItem.items = ensureIds(newItem.items);
    } else {
      newItem.items = [];
    }
    return newItem;
  });
};

// Utility function to get an item at a specific path
export const getItemAtPath = (items, path) => {
  let current = items;
  for (let i = 0; i < path.length; i++) {
    if (typeof path[i] === "number") {
      current = current[path[i]];
    } else if (path[i] === "items") {
      current = current.items;
    }
  }
  return current;
};

// Find an item by ID in the nested structure with caching
export const findItemById = (items, id, path = [], parentItems = null, cache = null) => {
  // Check cache first
  if (cache) {
    const cacheKey = id;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
  }

  if (!items || !Array.isArray(items)) return null;

  for (let i = 0; i < items.length; i++) {
    const currentPath = [...path, i];
    if (items[i].id === id) {
      const result = {
        item: items[i],
        path: currentPath,
        parentItems: parentItems || items,
        parentId: parentItems ? parentItems[0]?.id : null,
      };
      if (cache) {
        cache.set(id, result);
      }
      return result;
    }
    if (items[i].items && Array.isArray(items[i].items) && items[i].items.length > 0) {
      const result = findItemById(items[i].items, id, [...currentPath, "items"], items[i].items, cache);
      if (result) {
        return result;
      }
    }
  }
  return null;
};
