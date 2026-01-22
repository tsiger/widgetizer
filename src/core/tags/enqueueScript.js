/**
 * {% enqueue_script %} Liquid Tag
 *
 * Registers a JS file for deduped loading in the layout.
 *
 * Usage:
 * {% enqueue_script "widgets.js" %}
 * {% enqueue_script "vendor.js", { "defer": true, "async": false, "location": "header", "priority": 20 } %}
 *
 * Options:
 * - location: "footer" (default) or "header"
 * - priority: number (default: 50), lower numbers load first
 * - defer: boolean (default: false), opt-in
 * - async: boolean (default: false), opt-in
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

      // Parse location option (default: "footer")
      const location = this.options.location || "footer";

      // Parse priority option (default: 50)
      const priority = this.options.priority !== undefined ? this.options.priority : 50;

      const widgetContext = context.environments?.widget || null;

      // Add to the Map (filepath as key for deduplication)
      context.globals.enqueuedScripts.set(this.filepath, {
        defer: this.options.defer === true, // Opt-in
        async: this.options.async === true, // Opt-in
        location: location,
        priority: priority,
        source: widgetContext ? "widget" : "theme",
        widgetType: widgetContext?.type || null,
      });

      // No output - just registers the asset
      return "";
    } catch (error) {
      console.error("Error in enqueue_script tag:", error);
      return "";
    }
  },
};
