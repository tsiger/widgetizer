/**
 * `page_url` / `item_url` filters
 *
 * One way for a theme template to link to a page or a collection item. Both
 * wrap the render-time href helpers (`pageHref` / `itemHref`), reading the
 * project's Clean URLs setting and the render depth off `globals` so a template
 * never re-implements either:
 *
 *   <a href="{{ 'index' | page_url }}">          home, at any depth
 *   <a href="{{ 'contact' | page_url }}">
 *   <a href="{{ item.slug | item_url: 'news' }}">
 *
 * The value is the page slug (or the item slug, with the collection's
 * `slugPrefix` as the argument). Hrefs typed by an author go on through
 * `safe_url` / `prefixInternalHref` as before — these filters are for links a
 * theme builds itself from a known slug.
 *
 * Both link WITHIN the page's own language by default: on a Greek page,
 * `'index' | page_url` is the Greek homepage. A theme that wrote the obvious
 * thing would otherwise walk the visitor out of the language they were reading
 * — Arch's header logo did exactly that. A deliberate cross-language link says
 * so with a keyword argument (`page_url: lang: 'de'`, `item_url: 'news',
 * lang: 'de'`), keyword rather than positional because the positional slot is
 * #1 for `page_url` but #2 for `item_url`.
 */
import { pageHref, itemHref } from "../utils/internalHref.js";

/**
 * Read the href-shaping globals the engine stamps once per render.
 *
 * Two sources, because `{% render %}` — the only snippet form the bundled themes
 * use — isolates the environment scope: inside a snippet `context.get(["globals"])`
 * is undefined. The engine passes the same bag as LiquidJS's `globals` render
 * option too, and `context.globals` survives that isolation. Reading only the
 * environment would make a snippet silently emit a root-depth, non-clean href.
 */
function hrefOptions(context, args = []) {
  const bag = context?.get(["globals"]) || context?.globals || {};
  const prefix = bag.outputPathPrefix;
  return {
    cleanUrls: bag.cleanUrls === true,
    outputPathPrefix: typeof prefix === "string" ? prefix : "",
    language: targetLanguage(args) ?? bag.currentPageData?.language,
    defaultLanguage: bag.defaultLanguage,
  };
}

/** `lang:` from the call, if it is there. Keyword args arrive as plain objects. */
function targetLanguage(args) {
  for (const arg of args) {
    if (Array.isArray(arg) && arg.length === 2 && arg[0] === "lang") return arg[1];
    if (arg && typeof arg === "object" && !Array.isArray(arg) && typeof arg.lang === "string") return arg.lang;
  }
  return undefined;
}

export function registerPageUrlFilters(engine) {
  engine.registerFilter("page_url", function (slug, ...args) {
    if (typeof slug !== "string" || !slug) return "";
    return pageHref(slug, hrefOptions(this.context, args));
  });

  engine.registerFilter("item_url", function (slug, slugPrefix, ...args) {
    if (typeof slug !== "string" || !slug) return "";
    if (typeof slugPrefix !== "string" || !slugPrefix) return "";
    return itemHref(slugPrefix, slug, hrefOptions(this.context, args));
  });
}
