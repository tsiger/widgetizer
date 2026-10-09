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

/**
 * Build a flat settings object from a schema settings array.
 *
 * A setting naming a site string carries `resolvedDefault`, the word in the
 * language being edited. Whether that word is written into the new widget is
 * decided by whether the setting ALSO has a literal `default`: with one, the
 * value is something content must carry — a form field's label is its submitted
 * name — so the resolved word is stored and the owner edits it from there.
 * Without one, it stays a suggestion the render resolves per page, which is
 * what keeps one language's wording from following a page into its translations.
 */
export function buildDefaultSettings(settingsSchema) {
  const defaults = {};
  if (Array.isArray(settingsSchema)) {
    settingsSchema.forEach((setting) => {
      if (setting.default === undefined) return;
      defaults[setting.id] = setting.resolvedDefault !== undefined ? setting.resolvedDefault : setting.default;
    });
  }
  return defaults;
}

/**
 * Build a default block payload from a widget schema and a block type/overrides.
 */
export function buildDefaultBlock(widgetSchema, blockDef, generateBlockId) {
  const blockSchema = widgetSchema.blocks?.find((b) => b.type === blockDef.type);
  const blockSettings = {
    ...buildDefaultSettings(blockSchema?.settings),
    ...(blockDef.settings || {}),
    // Each starting block names its own words, because one block schema cannot
    // hold three different labels. English stays above as the fallback for a
    // language nothing was written in.
    ...(blockDef.resolvedDefaults || {}),
  };
  return {
    id: generateBlockId(),
    data: { type: blockDef.type, settings: blockSettings },
  };
}

/**
 * Build a complete default widget payload from a schema.
 */
export function buildDefaultWidget(widgetSchema, widgetType, generateBlockId) {
  const settings = buildDefaultSettings(widgetSchema.settings);
  const blocks = {};
  const blocksOrder = [];

  if (Array.isArray(widgetSchema.defaultBlocks)) {
    widgetSchema.defaultBlocks.forEach((blockDef) => {
      const { id, data } = buildDefaultBlock(widgetSchema, blockDef, generateBlockId);
      blocks[id] = data;
      blocksOrder.push(id);
    });
  }

  return { type: widgetType, settings, blocks, blocksOrder };
}

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
