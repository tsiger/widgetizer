/**
 * The rule for widget and block ids. An id names a widget in a page's or an
 * area's `widgets` map (a block in a widget's `blocks`) and is unique there. It
 * also becomes an HTML id, a `data-widget-id` the editor's preview looks up with
 * a CSS selector, and text themes put into their own CSS and scripts, so it is a
 * plain name: a letter or digit, then letters, digits, `_` and `-`. The cap is
 * the preview's message limit, past which the editor can't select the widget.
 * The editor's own ids (`widget_<uuid>`, `block_<uuid>`) and theme ids in
 * `snake_case` or `kebab-case` all fit.
 */
export const WIDGET_ID_MAX_LENGTH = 128;
export const WIDGET_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** Ids that name the site's header and footer, never a page or area widget. */
export const RESERVED_WIDGET_IDS = Object.freeze(["header", "footer"]);

// Names every plain object answers to (`constructor`, `toString`, …): a lookup
// that isn't own-property only finds one of these in any widgets map.
const BUILT_IN_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype));

const isPlainMap = (value) =>
  !!value && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Whether `id` may name a block. */
export function isValidBlockId(id) {
  return (
    typeof id === "string" && id.length <= WIDGET_ID_MAX_LENGTH && WIDGET_ID_RE.test(id) && !BUILT_IN_NAMES.has(id)
  );
}

/** Whether `id` may name a page or area widget. */
export function isValidWidgetId(id) {
  return isValidBlockId(id) && !RESERVED_WIDGET_IDS.includes(id);
}

/**
 * Whether the widget `id` renders from this page's or area's `widgets`: it names
 * a widget the map holds itself (never an inherited name), and isn't the header
 * or footer, which render as the site's own. Every render and every count of the
 * page's widgets goes by this, so they agree on what a page shows. A stored id
 * that breaks the rule otherwise still renders, so no content disappears, except
 * `__proto__`: parsed JSON holds it as an own key, but copying it into another
 * map (`Object.assign`, `map[id] = …`) changes that map's prototype instead.
 *
 * @param {Record<string, object>} widgets
 * @param {unknown} id
 */
export function isRenderedWidget(widgets, id) {
  return (
    typeof id === "string" &&
    id !== "__proto__" &&
    !RESERVED_WIDGET_IDS.includes(id) &&
    isPlainMap(widgets) &&
    Object.hasOwn(widgets, id) &&
    !!widgets[id]
  );
}

/**
 * The ids of a page's or area's widgets that render, in order, each once. An
 * order list is what counts, an empty one included; with none (an old or
 * hand-made file) the widgets render in the map's own order, as the editor
 * lists them.
 *
 * @param {Record<string, object>} widgets
 * @param {unknown} order - the stored `widgetsOrder`
 * @returns {string[]}
 */
export function renderedWidgetOrder(widgets, order) {
  if (!isPlainMap(widgets)) return [];
  const ids = Array.isArray(order) ? uniqueWidgetOrder(order) : Object.keys(widgets);
  return ids.filter((id) => isRenderedWidget(widgets, id));
}

/**
 * A page's or shared area's widget order with each id kept once, at its first
 * place. The widgets map holds one widget per id, so a repeated entry can only
 * be the same widget again; rendering every entry would let one save multiply
 * a large widget's render work far past the widget ceiling. Renders take it
 * through `renderedWidgetOrder`; saves, the editor's load and page/area copies
 * use it directly, so stored content cleans itself up. (A project copy, a backup
 * import or a theme's own templates can still bring repeats in; they render once
 * all the same.)
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
