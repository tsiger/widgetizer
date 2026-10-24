// A shared area is a named place in a theme's layout that the site owner fills
// with ordinary widgets, shared by every page of one language. The theme declares
// the areas in theme.json (`sharedAreas: [{ id, label }]`) and places each one in
// layout.liquid with `{{ shared_areas.<id> | raw }}`. The id is the area's lasting
// identity: saved content is filed under it, so a label can change freely.

/** Area ids name files and Liquid keys, so they stay plain. */
export const AREA_ID_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Widgets an area cannot hold yet. Export lists a site's forms from page content
 * only, so a form in an area would show on the site without being registered.
 */
export const AREA_UNSUPPORTED_WIDGET_TYPES = new Set(["core-form"]);

/**
 * Collection-listing roles that belong to one page: the collection's main listing
 * and the listing split into numbered pages. A widget shown on every page cannot
 * hold them.
 */
export const PAGE_ONLY_WIDGET_SETTINGS = ["listing_anchor", "paginate"];

/** Where a theme or preset keeps an area's starting content, under its templates/. */
export const AREA_TEMPLATES_DIR = "global/areas";

/** What a saved area holds, and what a missing area file reads as. */
export function emptyArea() {
  return { widgets: {}, widgetsOrder: [] };
}

/**
 * The areas a theme declares, in their editor order, and what is wrong with the
 * declaration. Invalid or repeated entries are left out rather than failing the
 * whole list, so one bad entry does not hide the theme's other areas.
 * @param {object} themeJson - The theme's theme.json
 * @returns {{ areas: Array<{ id: string, label: string }>, problems: string[] }}
 */
export function readAreaDeclarations(themeJson) {
  const declared = themeJson?.sharedAreas;
  if (declared === undefined) return { areas: [], problems: [] };
  if (!Array.isArray(declared)) return { areas: [], problems: ['"sharedAreas" must be an array of { id, label }.'] };

  const areas = [];
  const problems = [];
  const seen = new Set();
  declared.forEach((entry, index) => {
    const where = `sharedAreas[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      problems.push(`${where} must be an object with "id" and "label".`);
      return;
    }
    const { id, label } = entry;
    if (typeof id !== "string" || !AREA_ID_RE.test(id)) {
      problems.push(`${where}: "id" must match ${AREA_ID_RE}.`);
      return;
    }
    if (seen.has(id)) {
      problems.push(`${where}: the id "${id}" is declared twice.`);
      return;
    }
    if (typeof label !== "string" || !label.trim()) {
      problems.push(`${where}: "label" must be a non-empty string.`);
      return;
    }
    seen.add(id);
    areas.push({ id, label });
  });
  return { areas, problems };
}

/**
 * Why a widget cannot go in an area, or null. Used by the area save, the theme
 * checker for an area's starting content, and the editor's paste.
 * @param {object} widget - A widget as stored: `{ type, settings, blocks }`
 * @returns {string|null}
 */
export function areaWidgetProblem(widget) {
  if (AREA_UNSUPPORTED_WIDGET_TYPES.has(widget?.type)) {
    return `A "${widget.type}" widget cannot be placed in a shared area.`;
  }
  const settings = widget?.settings ?? {};
  const role = PAGE_ONLY_WIDGET_SETTINGS.find((id) => settings[id] === true);
  if (role) return `"${role}" belongs to one page and cannot be turned on in a shared area.`;
  return null;
}

/**
 * A theme's starting content for an area, as the area a site gets. Only the widget
 * list is kept, in order; a widget an area cannot hold is left out and a page-only
 * listing role is switched off, so content the theme checker would have refused
 * still cannot reach a site.
 * @param {object} template - `templates/global/areas/<id>.json`
 * @returns {{ widgets: object, widgetsOrder: string[] }}
 */
export function areaFromTemplate(template) {
  const source = template?.widgets && typeof template.widgets === "object" ? template.widgets : {};
  const order = Array.isArray(template?.widgetsOrder) ? template.widgetsOrder : Object.keys(source);
  const area = emptyArea();
  for (const id of order) {
    const widget = source[id];
    if (!widget || typeof widget !== "object" || AREA_UNSUPPORTED_WIDGET_TYPES.has(widget.type)) continue;
    const settings = { ...(widget.settings ?? {}) };
    for (const role of PAGE_ONLY_WIDGET_SETTINGS) if (settings[role] === true) settings[role] = false;
    area.widgets[id] = { ...widget, settings };
    area.widgetsOrder.push(id);
  }
  return area;
}
