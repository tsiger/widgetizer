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
    this.args = tagToken.args;

    // Parse the arguments
    const argString = this.args.trim();
    const matches = argString.match(/('|")([^'"]+)\1(?:\s*,\s*({[^}]+}))?/);

    if (matches) {
      this.filepath = matches[2];
      this.options = matches[3] ? JSON.parse(matches[3]) : {};
    } else {
      // Fallback: just a filepath
      this.filepath = argString.replace(/^['"]|['"]$/g, "");
      this.options = {};
    }
  },

  render(context) {
    try {
      if (!this.filepath) {
        console.warn("enqueue_style: No file path provided");
        return "";
      }

      // Initialize the enqueued styles Map if not exists
      if (!context.globals.enqueuedStyles) {
        context.globals.enqueuedStyles = new Map();
      }

      // Parse location option (default: "header")
      const location = this.options.location || "header";

      // Parse priority option (default: 50)
      const priority = this.options.priority !== undefined ? this.options.priority : 50;

      // Add to the Map (filepath as key for deduplication)
      context.globals.enqueuedStyles.set(this.filepath, {
        media: this.options.media || null,
        id: this.options.id || null,
        location: location,
        priority: priority,
      });

      // No output - just registers the asset
      return "";
    } catch (error) {
      console.error("Error in enqueue_style tag:", error);
      return "";
    }
  },
};
