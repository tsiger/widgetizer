/**
 * `collection` filter (Collections spec Section 12)
 *
 * Usage:
 *   {% assign items = 'portfolio' | collection %}
 *   {% assign recent = 'portfolio' | collection: limit: 6, sort: 'created_desc' %}
 *
 * Returns a list of collection items: { id, uuid, slug, url, created, updated, settings }.
 * The actual data load is delegated to an async `getCollectionItems` loader placed
 * on `globals` by the rendering service, so this file (under src/core, shared with
 * the browser bundle) never imports backend-only code.
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

    const globals = this.context.get(["globals"]);
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
