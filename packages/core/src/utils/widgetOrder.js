/**
 * A page's or shared area's widget order with each id kept once, at its first
 * place. The widgets map holds one widget per id, so a repeated entry can only
 * be the same widget again; rendering every entry would let one save multiply
 * a large widget's render work far past the widget ceiling. Every render goes
 * through this, so renders agree on what a page shows and on each widget's
 * number; saves, the editor's load and page/area copies do too, so stored
 * content cleans itself up. (A project copy, a backup import or a theme's own
 * templates can still bring repeats in; they render once all the same.)
 *
 * @template T
 * @param {T[]|null|undefined} order
 * @returns {T[]|null|undefined} a new array without repeats; anything that is not an array is returned as is
 */
export function uniqueWidgetOrder(order) {
  return Array.isArray(order) ? [...new Set(order)] : order;
}

/**
 * A widget with each block id kept once in its `blocksOrder` (first place), the
 * same rule one level down: themes render a widget's blocks by looping that
 * order. Anything without an array `blocksOrder` is returned as is.
 *
 * @param {object} widget
 * @returns {object}
 */
export function uniqueBlockOrder(widget) {
  if (!widget || typeof widget !== "object" || !Array.isArray(widget.blocksOrder)) return widget;
  return { ...widget, blocksOrder: uniqueWidgetOrder(widget.blocksOrder) };
}

/**
 * A widgets map (a page's or a shared area's) with `uniqueBlockOrder` applied to
 * each widget. Anything that is not a plain map is returned as is.
 *
 * @param {Record<string, object>} widgets
 * @returns {Record<string, object>}
 */
export function uniqueBlockOrders(widgets) {
  const proto = widgets && typeof widgets === "object" ? Object.getPrototypeOf(widgets) : undefined;
  if (proto !== Object.prototype && proto !== null) return widgets;
  return Object.fromEntries(Object.entries(widgets).map(([id, widget]) => [id, uniqueBlockOrder(widget)]));
}
