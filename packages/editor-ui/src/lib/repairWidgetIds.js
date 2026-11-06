import { isRenderedWidget, isValidBlockId, isValidWidgetId } from "@widgetizer/core/widgetOrder";

// The editor finds a widget in its state and in the preview by its id alone, so
// the ids it holds must follow the rule and be unique across the page and the
// areas shown with it. Stored content can break that (hand edits, imports, a theme
// update adding an area whose ids a page already uses), so a load repairs it here.
//
// A new id is derived from the widget's owner and its old id, never random: every
// tab and every load of the same content agrees on it, so a repair left unsaved
// comes back the same, and two tabs saving it write the same file.

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK = 0xffffffffffffffffn;
const encoder = new TextEncoder();

/** 64-bit FNV-1a of the UTF-8 of `text`, as 16 hex digits. */
function hash(text) {
  let h = FNV_OFFSET;
  for (const byte of encoder.encode(text)) h = ((h ^ BigInt(byte)) * FNV_PRIME) & MASK;
  return h.toString(16).padStart(16, "0");
}

/** `base`, or `base_2`, `base_3`, … : the first that `taken` doesn't hold. */
function firstFree(base, taken) {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

const isPlainMap = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const keysOf = (map) => (isPlainMap(map) ? Object.keys(map) : []);

/** A map with its keys renamed by `renames`, in the same order. */
const renameKeys = (map, renames) => Object.fromEntries(Object.entries(map).map(([id, value]) => [renames.get(id) ?? id, value]));

/**
 * A widget with its bad block ids renamed (in `blocks` and `blocksOrder`) and order
 * entries naming no block dropped, or the widget itself when there is nothing to
 * repair. Renamed blocks are added to `report`.
 */
function repairBlocks(widget, ownerKey, widgetId, report) {
  if (!isPlainMap(widget)) return widget;
  // A widget with no blocks map still has an order to clean: every entry names nothing.
  const hasBlocks = isPlainMap(widget.blocks);
  const ids = hasBlocks ? Object.keys(widget.blocks) : [];
  const taken = new Set(ids);
  const renames = new Map();
  for (const id of ids) {
    if (isValidBlockId(id)) continue;
    const to = firstFree(`block_${hash(`${ownerKey}\n${widgetId}\n${id}`)}`, taken);
    taken.add(to);
    renames.set(id, to);
    report.push({ owner: ownerKey, widget: widgetId, from: id, to });
  }
  const blocks = renames.size ? renameKeys(widget.blocks, renames) : hasBlocks ? widget.blocks : {};
  // A theme loops blocksOrder, so an entry that names no block is dropped, as a
  // widget order entry is.
  const order = Array.isArray(widget.blocksOrder)
    ? widget.blocksOrder
        .map((id) => (typeof id === "string" ? (renames.get(id) ?? id) : id))
        .filter((id) => typeof id === "string" && Object.hasOwn(blocks, id))
    : widget.blocksOrder;
  const orderChanged =
    Array.isArray(order) && (order.length !== widget.blocksOrder.length || order.some((id, i) => id !== widget.blocksOrder[i]));
  if (renames.size === 0 && !orderChanged) return widget;
  return { ...widget, ...(hasBlocks ? { blocks } : {}), ...(Array.isArray(order) ? { blocksOrder: order } : {}) };
}

/**
 * Repair the widget and block ids of a loaded page, its shared areas and the
 * header and footer, so every id the editor holds follows the rule and names one
 * widget on the page:
 *
 * - a widget id that breaks the rule gets a new one;
 * - an id two owners on the page use is kept by one: a widget the page renders,
 *   then the areas in the order the theme declares them, then a page widget that
 *   renders nowhere; every other copy gets a new id;
 * - order entries that name no widget are dropped (an area save refuses them);
 * - a block id that breaks the rule gets a new one, and block order entries that
 *   name no block are dropped.
 *
 * Areas the theme doesn't declare are neither rendered nor edited, so they are left
 * alone. Anything not repaired comes back as the same object.
 *
 * @param {{ page: object, sharedAreas: Record<string, object>, declaredAreaIds: string[],
 *   globalWidgets: { header: object|null, footer: object|null } }} content
 * @returns {{ page: object, sharedAreas: Record<string, object>, globalWidgets: object,
 *   changed: boolean, report: { widgets: object[], blocks: object[] } }}
 */
export function repairWidgetIds({ page, sharedAreas, declaredAreaIds, globalWidgets }) {
  const report = { widgets: [], blocks: [] };
  const owners = [
    { key: "page", holder: page },
    ...declaredAreaIds
      .filter((areaId) => isPlainMap(sharedAreas?.[areaId]))
      .map((areaId) => ({ key: `area:${areaId}`, areaId, holder: sharedAreas[areaId] })),
  ];

  // Every id on the page, so a new id never lands on one that is already there.
  const taken = new Set(owners.flatMap((owner) => keysOf(owner.holder.widgets)));
  for (const owner of owners) owner.renames = new Map();

  const rename = (owner, id) => {
    const to = firstFree(`widget_${hash(`${owner.key}\n${id}`)}`, taken);
    taken.add(to);
    owner.renames.set(id, to);
    report.widgets.push({ owner: owner.key, from: id, to });
  };

  // Who keeps an id two owners use, in turn: what the page renders, the areas in
  // declaration order, then page widgets that render nowhere. Renaming the area's
  // copy rather than the page's ends the clash on every page that shows the area,
  // and leaves the page widget's id, the one more likely to be in custom CSS or links.
  const pageOwner = owners[0];
  const pageIds = keysOf(page?.widgets);
  const rendered = (id) => Array.isArray(page?.widgetsOrder) && page.widgetsOrder.includes(id) && isRenderedWidget(page.widgets, id);
  const claims = [
    ...pageIds.filter(rendered).map((id) => [pageOwner, id]),
    ...owners.slice(1).flatMap((owner) => keysOf(owner.holder.widgets).map((id) => [owner, id])),
    ...pageIds.filter((id) => !rendered(id)).map((id) => [pageOwner, id]),
  ];
  const keptBy = new Map();
  for (const [owner, id] of claims) {
    if (!isValidWidgetId(id) || (keptBy.has(id) && keptBy.get(id) !== owner)) rename(owner, id);
    else keptBy.set(id, owner);
  }

  let changed = false;
  for (const owner of owners) {
    const { holder, renames } = owner;
    if (!isPlainMap(holder.widgets)) continue;
    const widgets = renames.size ? renameKeys(holder.widgets, renames) : holder.widgets;
    // Blocks are named from the widget's stored id, which every load sees the same.
    const oldIds = new Map([...renames].map(([from, to]) => [to, from]));
    let blocksRepaired = false;
    const repairedWidgets = Object.fromEntries(
      Object.entries(widgets).map(([id, widget]) => {
        const oldId = oldIds.get(id) ?? id;
        const repaired = repairBlocks(widget, owner.key, oldId, report.blocks);
        if (repaired !== widget) blocksRepaired = true;
        return [id, repaired];
      }),
    );
    const order = Array.isArray(holder.widgetsOrder)
      ? holder.widgetsOrder
          .map((id) => (typeof id === "string" ? (renames.get(id) ?? id) : id))
          .filter((id) => typeof id === "string" && Object.hasOwn(repairedWidgets, id))
      : holder.widgetsOrder;
    const orderChanged = Array.isArray(order) && (order.length !== holder.widgetsOrder.length || order.some((id, i) => id !== holder.widgetsOrder[i]));
    if (renames.size || blocksRepaired || orderChanged) {
      owner.repaired = { ...holder, widgets: blocksRepaired || renames.size ? repairedWidgets : holder.widgets, widgetsOrder: order };
      changed = true;
    }
  }

  const repairedGlobals = {};
  for (const key of ["header", "footer"]) {
    const widget = globalWidgets?.[key];
    const repaired = widget ? repairBlocks(widget, key, key, report.blocks) : widget;
    if (repaired !== widget) {
      repairedGlobals[key] = repaired;
      changed = true;
    }
  }

  const areaRepairs = owners.slice(1).filter((owner) => owner.repaired);
  return {
    page: pageOwner.repaired ?? page,
    sharedAreas: areaRepairs.length
      ? { ...sharedAreas, ...Object.fromEntries(areaRepairs.map((owner) => [owner.areaId, owner.repaired])) }
      : sharedAreas,
    globalWidgets: Object.keys(repairedGlobals).length ? { ...globalWidgets, ...repairedGlobals } : globalWidgets,
    changed,
    report,
  };
}
