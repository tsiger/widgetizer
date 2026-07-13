const MAX_DEPTH = 2; // 0, 1, 2 = 3 levels

/**
 * Flatten nested menu tree into a flat array for rendering and sorting.
 * Collapsed items are included but their children are omitted.
 */
export function flattenTree(items, expandedIds, depth = 0, parentId = null) {
  const result = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const hasChildren = item.items?.length > 0;
    const isExpanded = hasChildren && expandedIds.includes(item.id);

    result.push({
      id: item.id,
      depth,
      item,
      parentId,
      index: i,
      childCount: item.items?.length ?? 0,
    });

    if (isExpanded) {
      result.push(...flattenTree(item.items, expandedIds, depth + 1, item.id));
    }
  }

  return result;
}

/**
 * Get the maximum nesting depth within an item's subtree.
 * Leaf = 0, one level of children = 1, etc.
 */
export function getMaxSubtreeDepth(item) {
  if (!item.items || item.items.length === 0) return 0;
  let max = 0;
  for (const child of item.items) {
    max = Math.max(max, getMaxSubtreeDepth(child) + 1);
  }
  return max;
}

/**
 * Compute projected drop position during drag.
 * Uses a slot between visible rows as the single source of truth.
 */
export function getProjection(
  flatItemsWithoutActive,
  pointerY,
  deltaX,
  indentWidth,
  activeDepth,
  maxSubtreeDepth,
  rowRects,
) {
  const targetIndex = getTargetIndex(pointerY, rowRects);
  const prevItem = targetIndex > 0 ? flatItemsWithoutActive[targetIndex - 1] : null;
  const nextItem = targetIndex < flatItemsWithoutActive.length ? flatItemsWithoutActive[targetIndex] : null;

  const projectedDepth = activeDepth + getDepthOffset(deltaX, indentWidth);
  const maxDepth = Math.min(MAX_DEPTH - maxSubtreeDepth, prevItem ? prevItem.depth + 1 : 0);
  const minDepth = nextItem ? nextItem.depth : 0;
  const depth = Math.max(minDepth, Math.min(maxDepth, projectedDepth));
  const indicatorId = targetIndex === 0 ? nextItem?.id ?? null : prevItem?.id ?? null;
  const indicatorPosition = targetIndex === 0 ? "above" : "below";

  return {
    depth,
    parentId: getParentId(flatItemsWithoutActive, targetIndex, depth),
    targetIndex,
    indicatorId,
    indicatorPosition,
  };
}

/**
 * Check if potentialDescendantId is a descendant of itemId in the tree.
 */
export function isDescendant(items, itemId, potentialDescendantId) {
  if (!potentialDescendantId) return false;
  if (itemId === potentialDescendantId) return true;

  const item = findNodeById(items, itemId);
  if (!item) return false;

  return checkSubtree(item, potentialDescendantId);
}

function checkSubtree(node, targetId) {
  if (!node.items) return false;
  for (const child of node.items) {
    if (child.id === targetId) return true;
    if (checkSubtree(child, targetId)) return true;
  }
  return false;
}

/**
 * Find a node by ID in the nested tree. Returns the node or null.
 */
function findNodeById(items, id) {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.items?.length > 0) {
      const found = findNodeById(item.items, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Remove an item by ID from the nested tree.
 * Mutates the tree in-place and returns the removed item.
 */
function removeItemById(items, id) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      return items.splice(i, 1)[0];
    }
    if (items[i].items?.length > 0) {
      const found = removeItemById(items[i].items, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Apply a drop operation to the nested tree.
 * Returns a new tree with the active item moved to its projected position.
 */
export function applyDrop(items, activeId, projection, flatItemsWithoutActive) {
  const newItems = structuredClone(items);
  const { depth, parentId, targetIndex } = projection;

  const activeItem = removeItemById(newItems, activeId);
  if (!activeItem) return items;

  if (depth === 0) {
    const insertIndex = getSiblingInsertIndex(newItems, null, 0, targetIndex, flatItemsWithoutActive);
    newItems.splice(insertIndex, 0, activeItem);
    return newItems;
  }

  const parent = findNodeById(newItems, parentId);
  if (!parent) return items;

  if (!parent.items) {
    parent.items = [];
  }

  const insertIndex = getSiblingInsertIndex(parent.items, parentId, depth, targetIndex, flatItemsWithoutActive);
  parent.items.splice(insertIndex, 0, activeItem);

  return newItems;
}

/**
 * Remove active item and its visible descendants from the flattened list.
 */
export function removeActiveFromFlat(flattenedItems, activeId) {
  const activeIndex = flattenedItems.findIndex((f) => f.id === activeId);
  if (activeIndex === -1) return flattenedItems;

  const activeDepth = flattenedItems[activeIndex].depth;
  let endIndex = activeIndex + 1;

  while (endIndex < flattenedItems.length && flattenedItems[endIndex].depth > activeDepth) {
    endIndex++;
  }

  return [...flattenedItems.slice(0, activeIndex), ...flattenedItems.slice(endIndex)];
}

function getTargetIndex(pointerY, rowRects) {
  if (!rowRects || rowRects.length === 0) {
    return 0;
  }

  if (pointerY <= rowRects[0].mid) {
    return 0;
  }

  for (let i = 1; i < rowRects.length; i++) {
    if (pointerY <= rowRects[i].mid) {
      return i;
    }
  }

  return rowRects.length;
}

function getParentId(flatItems, targetIndex, depth) {
  if (depth === 0) {
    return null;
  }

  const prevItem = targetIndex > 0 ? flatItems[targetIndex - 1] : null;

  if (!prevItem) {
    return null;
  }

  if (depth === prevItem.depth + 1) {
    return prevItem.id;
  }

  if (depth === prevItem.depth) {
    return prevItem.parentId;
  }

  for (let i = targetIndex - 1; i >= 0; i--) {
    if (flatItems[i].depth === depth - 1) {
      return flatItems[i].id;
    }
  }

  return null;
}

function getSiblingInsertIndex(siblings, parentId, depth, targetIndex, flatItemsWithoutActive) {
  let siblingCount = 0;
  for (let i = 0; i < targetIndex; i++) {
    const candidate = flatItemsWithoutActive[i];
    if (candidate.depth === depth && candidate.parentId === parentId) {
      siblingCount++;
    }
  }
  return Math.min(siblingCount, siblings.length);
}

function getDepthOffset(deltaX, indentWidth) {
  if (deltaX >= 0) {
    return Math.floor(deltaX / indentWidth);
  }

  return Math.ceil(deltaX / indentWidth);
}
