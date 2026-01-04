/**
 * {% enqueue_script %} Liquid Tag
 *
 * Registers a JS file for deduped loading in the layout footer.
 *
 * Usage:
 * {% enqueue_script "widgets.js" %}
 * {% enqueue_script "vendor.js", { "defer": false, "async": true } %}
 */
export const EnqueueScriptTag = {
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
        console.warn("enqueue_script: No file path provided");
        return "";
      }

      // Initialize the enqueued scripts Map if not exists
      if (!context.globals.enqueuedScripts) {
        context.globals.enqueuedScripts = new Map();
      }

      // Add to the Map (filepath as key for deduplication)
      context.globals.enqueuedScripts.set(this.filepath, {
        defer: this.options.defer || false, // Default false (render_scripts is in footer)
        async: this.options.async || false,
      });

      // No output - just registers the asset
      return "";
    } catch (error) {
      console.error("Error in enqueue_script tag:", error);
      return "";
    }
  },
};
