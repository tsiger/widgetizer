import { Tokenizer, evalToken } from "liquidjs";

/**
 * {% enqueue_style %} Liquid Tag
 *
 * Registers a CSS file for deduped loading in the layout.
 *
 * Usage:
 * {% enqueue_style "slideshow.css" %}
 * {% enqueue_style "special.css", { "media": "print", "location": "footer", "priority": 10 } %}
 *
 * Options:
 * - location: "header" (default) or "footer"
 * - priority: number (default: 50), lower numbers load first
 * - media: string (e.g., "print", "screen")
 * - id: string for the link tag id attribute
 */
export const EnqueueStyleTag = {
  parse(tagToken) {
    const tokenizer = new Tokenizer(tagToken.args);

    // Read the filepath token (not evaluated yet)
    this.filepathToken = tokenizer.readValue();

    // Skip comma and whitespace
    tokenizer.skipBlank();
    if (tokenizer.peek() === ",") {
      tokenizer.advance();
      tokenizer.skipBlank();
    }

    // Read the options object token if present
    this.optionsToken = null;
    if (!tokenizer.end()) {
      this.optionsToken = tokenizer.readValue();
    }
  },

  *render(context) {
    try {
      // Evaluate tokens to get actual values
      const filepath = yield evalToken(this.filepathToken, context);
      const options = this.optionsToken ? yield evalToken(this.optionsToken, context) : {};

      if (!filepath) {
        console.warn("enqueue_style: No file path provided");
        return "";
      }

      // Initialize the enqueued styles Map if not exists
      if (!context.globals.enqueuedStyles) {
        context.globals.enqueuedStyles = new Map();
      }

      // Parse location option (default: "header")
      const location = options.location || "header";

      // Parse priority option (default: 50)
      const priority = options.priority !== undefined ? options.priority : 50;

      const widgetContext = context.environments?.widget || null;

      // Add to the Map (filepath as key for deduplication)
      context.globals.enqueuedStyles.set(filepath, {
        media: options.media || null,
        id: options.id || null,
        location: location,
        priority: priority,
        source: widgetContext ? "widget" : "theme",
        widgetType: widgetContext?.type || null,
      });

      // No output - just registers the asset
      return "";
    } catch (error) {
      console.error("Error in enqueue_style tag:", error);
      return "";
    }
  },
};
