import { Hash } from "liquidjs";

/**
 * {% enqueue_preload %} Liquid Tag
 *
 * Registers a resource preload directive for the <head>.
 *
 * Usage:
 * {% enqueue_preload src: "hero.jpg", as: "image", fetchpriority: "high" %}
 * {% enqueue_preload src: "font.woff2", as: "font", type: "font/woff2", crossorigin: true %}
 * {% enqueue_preload src: "script.js", as: "script" %}
 *
 * Options:
 * - src: string (required)
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
    const { src, as, type, fetchpriority, media, imagesrcset, imagesizes, crossorigin } = options;

    if (!src || !as) {
      console.warn("enqueue_preload: Missing required 'src' or 'as' attributes");
      return "";
    }

    // Initialize the enqueued preloads Map if not exists
    if (!context.globals.enqueuedPreloads) {
      context.globals.enqueuedPreloads = new Map();
    }

    // Use src as key for deduplication
    context.globals.enqueuedPreloads.set(src, {
      as,
      type,
      fetchpriority,
      media,
      imagesrcset,
      imagesizes,
      crossorigin: crossorigin === true,
    });

    return "";
  },
};
