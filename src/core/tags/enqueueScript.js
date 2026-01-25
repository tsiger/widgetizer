import { Tokenizer, evalToken } from "liquidjs";

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
        console.warn("enqueue_script: No file path provided");
        return "";
      }

      // Initialize the enqueued scripts Map if not exists
      if (!context.globals.enqueuedScripts) {
        context.globals.enqueuedScripts = new Map();
      }

      // Parse location option (default: "footer")
      const location = options.location || "footer";

      // Parse priority option (default: 50)
      const priority = options.priority !== undefined ? options.priority : 50;

      const widgetContext = context.environments?.widget || null;

      // Add to the Map (filepath as key for deduplication)
      context.globals.enqueuedScripts.set(filepath, {
        defer: options.defer === true, // Opt-in
        async: options.async === true, // Opt-in
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
