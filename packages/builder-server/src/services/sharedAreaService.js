import { areaKey, areasDir } from "@widgetizer/core/contentAddress";
import { AREA_ID_RE, areaWidgetProblem, emptyArea, readAreaDeclarations } from "@widgetizer/core/sharedAreas";

// A shared area's content is one file per area and language, beside the header and
// footer (see contentAddress). Areas are read through the storage adapter, so they
// follow the same scope as every other content read.

const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);

/** An area file that exists but cannot be read as an area. Never treated as empty. */
export class AreaUnreadableError extends Error {
  constructor(id, cause) {
    super(`The shared area "${id}" could not be read.`);
    this.code = "AREA_UNREADABLE";
    this.statusCode = 500;
    this.areaId = id;
    this.cause = cause;
  }
}

/**
 * The areas the project's theme declares, in editor order. A project without a
 * readable theme.json declares none; its saved areas then show as retained.
 * @returns {Promise<Array<{ id: string, label: string }>>}
 */
export async function readDeclaredAreas(storage, scope) {
  const buf = await storage.read(scope, "theme.json");
  if (buf == null) return [];
  try {
    return readAreaDeclarations(JSON.parse(buf.toString("utf8"))).areas;
  } catch (error) {
    console.warn(`Could not read the shared areas declared in theme.json: ${error.message}`);
    return [];
  }
}

/**
 * Keep only what an area holds. The order may be missing in a hand-made file; the
 * widgets' own order stands in for it, as it does for pages.
 */
function toArea(id, data) {
  if (!isPlainObject(data) || (data.widgets !== undefined && !isPlainObject(data.widgets))) {
    throw new AreaUnreadableError(id, new Error("not an object with a widgets map"));
  }
  const widgets = data.widgets ?? {};
  const widgetsOrder = Array.isArray(data.widgetsOrder)
    ? data.widgetsOrder.filter((widgetId) => typeof widgetId === "string")
    : Object.keys(widgets);
  return { widgets, widgetsOrder };
}

/**
 * One area's content in one language. A missing file is an empty area; a file that
 * cannot be read or parsed throws, so a caller can never overwrite it as empty.
 */
export async function readArea(storage, scope, id, lang) {
  const buf = await storage.read(scope, areaKey(id, lang));
  if (buf == null) return emptyArea();
  let data;
  try {
    data = JSON.parse(buf.toString("utf8"));
  } catch (error) {
    throw new AreaUnreadableError(id, error);
  }
  return toArea(id, data);
}

/** Ids of the areas saved for a language, whether or not the theme still declares them. */
export async function listSavedAreaIds(storage, scope, lang) {
  const names = await storage.list(scope, areasDir(lang));
  return names
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length))
    .filter((id) => AREA_ID_RE.test(id));
}

/**
 * Every area a language has: the declared ones (with their content, empty when
 * never saved) and the retained ones, saved content the theme no longer shows.
 * @returns {Promise<{ declared: Array<{ id: string, label: string }>, retained: Array<{ id: string }>,
 *   areas: Record<string, { widgets: object, widgetsOrder: string[] }> }>}
 */
export async function listAreas(storage, scope, lang) {
  const declared = await readDeclaredAreas(storage, scope);
  const declaredIds = new Set(declared.map((area) => area.id));
  const retained = (await listSavedAreaIds(storage, scope, lang))
    .filter((id) => !declaredIds.has(id))
    .map((id) => ({ id }));

  const areas = {};
  for (const { id } of [...declared, ...retained]) areas[id] = await readArea(storage, scope, id, lang);
  return { declared, retained, areas };
}

/**
 * Why an area's content cannot be saved, or null. Checks the shape the editor
 * sends and the rules an area adds to ordinary widgets.
 * @param {unknown} area - The request body
 * @param {number} maxWidgets - The widget ceiling, applied to the area alone
 * @returns {{ status: number, message: string }|null}
 */
export function areaSaveProblem(area, maxWidgets) {
  if (!isPlainObject(area) || !isPlainObject(area.widgets) || !Array.isArray(area.widgetsOrder)) {
    return { status: 400, message: "A shared area needs a widgets map and a widgetsOrder list." };
  }
  const ids = Object.keys(area.widgets);
  const count = Math.max(ids.length, area.widgetsOrder.length);
  if (Number.isFinite(maxWidgets) && count > maxWidgets) {
    return { status: 422, message: `Too many widgets in this area (${count}); the maximum is ${maxWidgets}.` };
  }
  for (const widgetId of area.widgetsOrder) {
    if (typeof widgetId !== "string" || !Object.hasOwn(area.widgets, widgetId)) {
      return { status: 400, message: "Every entry of widgetsOrder must name a widget in the area." };
    }
  }
  for (const widgetId of ids) {
    const widget = area.widgets[widgetId];
    if (!isPlainObject(widget) || typeof widget.type !== "string") {
      return { status: 400, message: `The widget "${widgetId}" needs a type.` };
    }
    const problem = areaWidgetProblem(widget);
    if (problem) return { status: 422, message: problem };
  }
  return null;
}
