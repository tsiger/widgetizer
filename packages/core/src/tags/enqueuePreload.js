import { Hash } from "liquidjs";

/**
 * {% enqueue_preload %} Liquid Tag
 *
 * Registers a resource preload directive for the <head>.
 *
 * Usage:
 * {% enqueue_preload src: lcp_image_url, as: "image", fetchpriority: "high" %}
 * {% enqueue_preload src: "fonts/Inter.woff2", as: "font", type: "font/woff2", crossorigin: true %}
 * {% enqueue_preload src: "script.js", as: "script" %}
 *
 * For as: "script" / "style" / "font", a path relative to the theme's assets/
 * folder (no scheme, no leading "/", no "assets/" prefix) is resolved like the
 * request it warms — assets/ path, depth prefix and (CSS/JS only) ?v= token in
 * exports, the preview API route in the editor. Scripts/styles follow
 * enqueue_script's origin rule (the widget's own route inside a widget, unless
 * theme: true); fonts always resolve against the theme's assets/, matching the
 * url() in the stylesheet that declares them. Any src that is already a URL is
 * used as given (only depth-prefixed) — image preloads take the output of
 * {% image … output: 'path' %}.
 *
 * Options:
 * - src: string (required)
 * - theme: boolean (optional) for script/style preloads inside a widget: the
 *   file is a theme asset, not the widget's own (mirrors enqueue_script)
 * - as: string (required) e.g., "image", "script", "font", "style"
 * - type: string (optional) e.g., "image/jpeg", "font/woff2"
 * - fetchpriority: "high" | "low" | "auto" (optional)
 * - media: string (optional) media query
 * - imagesrcset: string (optional) for responsive images
 * - imagesizes: string (optional) for responsive images
 * - crossorigin: boolean (optional)
 */
export const EnqueuePreloadTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const { src, as, type, fetchpriority, media, imagesrcset, imagesizes, crossorigin, theme = false } = options;

    if (!src || !as) {
      console.warn("enqueue_preload: Missing required 'src' or 'as' attributes");
      return "";
    }

    // Initialize the enqueued preloads Map if not exists
    if (!context.globals.enqueuedPreloads) {
      context.globals.enqueuedPreloads = new Map();
    }

    // Same origin bookkeeping as enqueue_script / enqueue_style: a preload from
    // inside a widget must resolve to the widget's own preview route, or it
    // warms a different URL than the script it is meant to pair with.
    const widgetContext = context.environments?.widget || null;
    const isThemeAsset = theme === true;

    // Use src as key for deduplication
    context.globals.enqueuedPreloads.set(src, {
      as,
      type,
      fetchpriority,
      media,
      imagesrcset,
      imagesizes,
      crossorigin: crossorigin === true,
      source: widgetContext && !isThemeAsset ? "widget" : "theme",
      widgetType: widgetContext && !isThemeAsset ? widgetContext.type : null,
    });

    return "";
  },
};
