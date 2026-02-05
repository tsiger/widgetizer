import { Hash } from "liquidjs";

/**
 * {% enqueue_style %} Liquid Tag
 *
 * Registers a CSS file for deduped loading in the layout.
 *
 * Usage:
 * {% enqueue_style src: "slideshow.css" %}
 * {% enqueue_style src: "special.css", media: "print", location: "footer", priority: 10 %}
 *
 * Options:
 * - src: string (required)
 * - location: "header" (default) or "footer"
 * - priority: number (default: 50), lower numbers load first
 * - media: string (e.g., "print", "screen")
 * - id: string for the link tag id attribute
 */
export const EnqueueStyleTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const { src: filepath, location = "header", priority = 50, media = null, id = null } = options;

    if (!filepath) {
      console.warn("enqueue_style: No 'src' provided");
      return "";
    }

    // Initialize the enqueued styles Map if not exists
    if (!context.globals.enqueuedStyles) {
      context.globals.enqueuedStyles = new Map();
    }

    const widgetContext = context.environments?.widget || null;

    // Add to the Map (filepath as key for deduplication)
    context.globals.enqueuedStyles.set(filepath, {
      media: media,
      id: id,
      location: location,
      priority: priority,
      source: widgetContext ? "widget" : "theme",
      widgetType: widgetContext?.type || null,
    });

    // No output - just registers the asset
    return "";
  },
};
