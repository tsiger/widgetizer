/**
 * `collection` filter (docs-llms/core-collections.md §5)
 *
 * Usage:
 *   {% assign items = 'portfolio' | collection %}
 *   {% assign recent = 'portfolio' | collection: limit: 6, sort: 'created_desc' %}
 *
 * Returns a list of collection items: { id, uuid, slug, url, created, updated, settings }.
 * The actual data load is delegated to an async `getCollectionItems` loader placed
 * on `globals` by the rendering shell (OSS `buildRenderDeps` / hosted
 * `buildCloudRenderDeps`), so this file (under @widgetizer/core, shared with the
 * browser bundle) never imports backend-only code.
 */

const KNOWN_OPTIONS = new Set(["limit", "sort", "offset"]);

/**
 * Normalize LiquidJS filter arguments into a { limit, sort, offset } options
 * object. Keyword arguments arrive as plain objects; positional tuples ([key,
 * value] pairs) are also tolerated.
 */
export function normalizeCollectionFilterArgs(args) {
  const options = {};
  for (const arg of args) {
    if (Array.isArray(arg) && arg.length === 2 && KNOWN_OPTIONS.has(arg[0])) {
      // positional [key, value] tuple (LiquidJS sometimes yields these)
      options[arg[0]] = arg[1];
    } else if (arg && typeof arg === "object" && !Array.isArray(arg)) {
      for (const [key, value] of Object.entries(arg)) {
        if (KNOWN_OPTIONS.has(key)) options[key] = value;
      }
    }
  }
  return options;
}

export function registerCollectionFilter(engine) {
  engine.registerFilter("collection", function (collectionType, ...args) {
    if (!collectionType || typeof collectionType !== "string") return [];

    // Two sources: `{% render %}` isolates the environment scope, so inside a
    // snippet `context.get(["globals"])` is undefined. The engine passes the same
    // bag as LiquidJS's `globals` render option, and `context.globals` survives
    // that isolation. Reading only the environment would make a listing inside a
    // snippet silently return []. (Do not reach for the loader with
    // `context.get(["getCollectionItems"])` — a scope lookup CALLS a function it
    // finds, so that returns the loader's result, not the loader.)
    const globals = this.context.get(["globals"]) || this.context.globals;
    const loader = globals?.getCollectionItems;
    if (typeof loader !== "function") {
      // No loader wired (e.g. a non-render context). Return empty rather than
      // importing backend code into this browser-shared module.
      return [];
    }

    // Returning a Promise makes this an async filter; LiquidJS awaits it.
    return loader(collectionType, normalizeCollectionFilterArgs(args));
  });
}
