import { Hash } from "liquidjs";

/**
 * {% enqueue_script %} Liquid Tag
 *
 * Registers a JS file for deduped loading in the layout.
 *
 * Usage:
 * {% enqueue_script src: "widgets.js" %}
 * {% enqueue_script src: "vendor.js", defer: true, async: false, location: "header", priority: 20 %}
 *
 * Options:
 * - src: string (required)
 * - location: "footer" (default) or "header"
 * - priority: number (default: 50), lower numbers load first
 * - defer: boolean (default: false), opt-in
 * - async: boolean (default: false), opt-in
 */
export const EnqueueScriptTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const { src: filepath, location = "footer", priority = 50, defer = false, async = false } = options;

    if (!filepath) {
      console.warn("enqueue_script: No 'src' provided");
      return "";
    }

    // Initialize the enqueued scripts Map if not exists
    if (!context.globals.enqueuedScripts) {
      context.globals.enqueuedScripts = new Map();
    }

    const widgetContext = context.environments?.widget || null;

    // Add to the Map (filepath as key for deduplication)
    context.globals.enqueuedScripts.set(filepath, {
      defer: defer === true, // Opt-in
      async: async === true, // Opt-in
      location: location,
      priority: priority,
      source: widgetContext ? "widget" : "theme",
      widgetType: widgetContext?.type || null,
    });

    // No output - just registers the asset
    return "";
  },
};
