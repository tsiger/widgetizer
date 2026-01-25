import { Tokenizer, evalToken } from "liquidjs";

export const AssetTag = {
  parse(tagToken) {
    this.name = tagToken.name;
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
    /**
     * The asset tag is used to include CSS, JavaScript, and other assets in templates.
     *
     * Basic usage:
     * {% asset "filename.css" %}
     * {% asset "filename.js" %}
     *
     * Advanced usage with options:
     * {% asset "filename.js", { "defer": true, "async": true } %}
     *
     * File Location:
     * Assets are loaded from different directories based on context:
     * - When used in a widget template: loads from "widgets/{widgetType}/{filename}"
     * - When used in layout/snippets: loads from "assets/{filename}"
     *
     * Available options:
     * - defer (boolean, default: false): For JS files, whether to add the defer attribute (opt-in)
     *   Example: {% asset "script.js", { "defer": true } %}
     *
     * - async (boolean, default: false): For JS files, whether to add the async attribute (opt-in)
     *   Example: {% asset "script.js", { "async": true } %}
     *
     * - crossorigin (string, default: null): For resources loaded from other domains
     *   Values: "anonymous", "use-credentials", or null
     *   Example: {% asset "font.css", { "crossorigin": "anonymous" } %}
     *
     * - integrity (string, default: null): Subresource Integrity hash for security
     *   Example: {% asset "vendor.js", { "integrity": "sha384-..." } %}
     *
     * - media (string, default: null): For CSS files, specifies media query
     *   Example: {% asset "mobile.css", { "media": "screen and (max-width: 768px)" } %}
     *
     * - id (string, default: null): Adds an ID attribute to the tag
     *   Example: {% asset "theme.css", { "id": "theme-stylesheet" } %}
     */
    try {
      // Evaluate tokens to get actual values
      const filepath = yield evalToken(this.filepathToken, context);
      const options = this.optionsToken ? yield evalToken(this.optionsToken, context) : {};

      if (!filepath) {
        throw new Error("No file path provided to asset tag");
      }

      // Get context globals
      const globals = context.globals || {};
      const apiUrl = globals.apiUrl || "";
      const activeProjectId = globals.projectId || "";
      const renderMode = globals.renderMode || "preview"; // Default to preview

      // Determine file type from extension
      const isCSS = filepath.endsWith(".css");
      const isJS = filepath.endsWith(".js");
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filepath);

      let assetUrl;
      if (renderMode === "publish") {
        // For publish mode, use a relative path assuming all assets are in a top-level 'assets' folder
        assetUrl = `assets/${filepath}`;
      } else {
        // For preview mode, use the existing API route
        // Determine the source folder based on the current template context
        if (context.environments.widget && context.environments.widget.type) {
          // Inside a widget template: load from widgets/{widgetType}/
          const widgetType = context.environments.widget.type;
          assetUrl = `${apiUrl}/api/preview/assets/${activeProjectId}/widgets/${widgetType}/${filepath}`;
        } else {
          // In layout/snippets: load from assets/
          assetUrl = `${apiUrl}/api/preview/assets/${activeProjectId}/assets/${filepath}`;
        }
      }

      // Extract options with defaults (opt-in behavior)
      const {
        defer = false,
        async = false,
        crossorigin = null,
        integrity = null,
        media = null,
        id = null,
      } = options;

      // Build attributes string
      let attributes = "";
      if (id) attributes += ` id="${id}"`;
      if (crossorigin) attributes += ` crossorigin="${crossorigin}"`;
      if (integrity) attributes += ` integrity="${integrity}"`;

      // For images, check if we have metadata in the context
      if (isImage && context.mediaDimensions && context.mediaDimensions[filepath]) {
        const imageData = context.mediaDimensions[filepath];
        if (imageData.alt) attributes += ` alt="${imageData.alt}"`;
        if (imageData.title) attributes += ` title="${imageData.title}"`;
      }

      // Return the appropriate HTML tag based on file type
      if (isCSS) {
        let cssTag = `<link rel="stylesheet" href="${assetUrl}"${attributes}`;
        if (media) cssTag += ` media="${media}"`;
        cssTag += `>`;
        return cssTag;
      } else if (isJS) {
        let scriptTag = `<script src="${assetUrl}"${attributes}`;
        // Only add attributes if explicitly set to true (opt-in)
        if (defer === true) scriptTag += " defer";
        if (async === true) scriptTag += " async";
        scriptTag += `></script>`;
        return scriptTag;
      } else if (isImage) {
        // For images, return an img tag with the URL and any metadata
        return `<img src="${assetUrl}"${attributes}>`;
      } else {
        // For other file types, return the URL
        return assetUrl;
      }
    } catch (error) {
      console.error("Error in asset tag:", error);
      return `<!-- Error loading asset: ${error.message} -->`;
    }
  },
};
