/**
 * Pure helpers for widgetStore operations.
 * No React/Zustand/store imports — these are plain functions.
 */

// ---------------------------------------------------------------------------
// Ordered-array helpers
// ---------------------------------------------------------------------------

/**
 * Insert an ID at a specific position in an order array.
 * If position exceeds the array length, appends to the end.
 */
export function insertIdAtPosition(order, id, position) {
  const newOrder = [...order];
  if (position >= newOrder.length) {
    newOrder.push(id);
  } else {
    newOrder.splice(position, 0, id);
  }
  return newOrder;
}

/**
 * Insert a new ID immediately after a source ID in an order array.
 * Falls back to appending if the source ID is not found.
 */
export function insertIdAfter(order, sourceId, newId) {
  const newOrder = [...order];
  const index = newOrder.indexOf(sourceId);
  if (index !== -1) {
    newOrder.splice(index + 1, 0, newId);
  } else {
    newOrder.push(newId);
  }
  return newOrder;
}

/**
 * Remove an ID from an order array.
 */
export function removeIdFromOrder(order, id) {
  return order.filter((item) => item !== id);
}

/**
 * After removing an item from an ordered list, pick the best next selection.
 * Rule: prefer previous; if was first, take next; if was only, return null.
 */
export function getNextSelectedId(order, removedId) {
  const removedIndex = order.indexOf(removedId);
  const remaining = order.filter((id) => id !== removedId);
  if (remaining.length === 0) return null;
  if (removedIndex > 0) return remaining[removedIndex - 1];
  return remaining[0];
}

// ---------------------------------------------------------------------------
// Schema-default builders
// ---------------------------------------------------------------------------

export { buildDefaultSettings, buildDefaultBlock, buildDefaultWidget } from "@widgetizer/core/widgetDefaults";

// ---------------------------------------------------------------------------
// Clone helpers
// ---------------------------------------------------------------------------

/**
 * Deep-clone a block, returning the new data (caller assigns the ID).
 */
export function cloneBlock(block) {
  return JSON.parse(JSON.stringify(block));
}

/**
 * Deep-clone a widget, regenerating all block IDs.
 */
export function cloneWidgetWithNewBlockIds(widget, generateBlockId) {
  const cloned = JSON.parse(JSON.stringify(widget));
  const newBlocks = {};
  const newBlocksOrder = [];

  (widget.blocksOrder || []).forEach((oldBlockId) => {
    const newBlockId = generateBlockId();
    newBlocks[newBlockId] = cloned.blocks?.[oldBlockId] || {};
    newBlocksOrder.push(newBlockId);
  });

  return { ...cloned, blocks: newBlocks, blocksOrder: newBlocksOrder };
}

export function withoutListingFlags(widget) {
  if (!widget?.settings?.paginate && !widget?.settings?.listing_anchor) return widget;
  return { ...widget, settings: { ...widget.settings, paginate: false, listing_anchor: false } };
}
