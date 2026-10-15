/**
 * `t` filter — the words a theme puts on the published page.
 *
 *   <button aria-label="{{ 'site.common.next' | t }}">
 *   <span>{{ 'site.slideshow.go_to_slide' | t: number: forloop.index }}</span>
 *
 * A theme keeps these under the `site` root of its `locales/<lang>.json` files,
 * apart from the `tTheme:` keys above it, which name settings in the editor and
 * stay English. The strings resolve in the language of the page being rendered,
 * falling back to the theme's English wording key by key, so a theme that ships
 * no translation behaves exactly as one with the words typed into its markup.
 *
 * The strings themselves are placed on `globals` by the rendering shell; this
 * file is shared with the browser bundle and loads nothing.
 */

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Two sources, for the same reason `page_url` has two: `{% render %}` isolates
 * the environment scope, so inside a snippet `context.get(["globals"])` is
 * undefined while `context.globals` survives.
 */
function bagOf(context) {
  return context?.get(["globals"]) || context?.globals || {};
}

function valueAt(source, key) {
  let node = source;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * The string for `key` in `language`, or the default language's, or undefined.
 * @param {object} strings - { [language]: nested object }
 */
export function resolveSiteString(strings, key, language, defaultLanguage) {
  if (!strings || typeof key !== "string" || !key) return undefined;
  // Keys are written the way a theme author reads them — `site.common.next` —
  // while what is loaded is the `site` block itself, so the root is implied.
  const path = key.startsWith("site.") ? key.slice(5) : key;
  const tried = [language, defaultLanguage, "en"].filter(Boolean);
  for (const lang of tried) {
    const found = valueAt(strings[lang], path);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Keyword arguments arrive as plain objects, positional pairs as tuples. */
export function normalizeSiteStringArgs(args) {
  const values = {};
  for (const arg of args) {
    if (Array.isArray(arg) && arg.length === 2) values[arg[0]] = arg[1];
    else if (arg && typeof arg === "object") Object.assign(values, arg);
  }
  return values;
}

export function fillPlaceholders(text, values) {
  return text.replace(PLACEHOLDER, (whole, name) =>
    Object.hasOwn(values, name) && values[name] != null ? String(values[name]) : whole,
  );
}

export function registerSiteStringFilter(engine) {
  engine.registerFilter("t", function (key, ...args) {
    if (typeof key !== "string" || !key) return "";
    const globals = bagOf(this.context);
    const found = resolveSiteString(
      globals.siteStrings,
      key,
      globals.currentPageData?.language,
      globals.defaultLanguage,
    );
    // A key nobody has written yet reads as its last segment rather than as a
    // blank: a gap in a translation should be visible without taking the
    // control's label away from the person who needs it most.
    if (found === undefined) return key.split(".").pop().replace(/_/g, " ");
    return fillPlaceholders(found, normalizeSiteStringArgs(args));
  });
}
