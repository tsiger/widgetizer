/**
 * Check whether a widget has reached or exceeded its maxBlocks limit.
 * @param {Object} widget - The widget instance (from page data)
 * @param {Object} widgetSchema - The schema definition for this widget type
 * @returns {boolean} True if the widget cannot accept more blocks
 */
export function hasReachedMaxBlocks(widget, widgetSchema) {
  const maxBlocks = widgetSchema?.maxBlocks;
  if (maxBlocks == null || maxBlocks <= 0) return false;
  return (widget?.blocksOrder?.length ?? 0) >= maxBlocks;
}
