export const AssetTag = {
  parse(tagToken) {
    this.args = tagToken.args;
    this.name = tagToken.name;

    // Parse the arguments
    const argString = this.args.trim();
    const matches = argString.match(/('|")([^'"]+)\1(?:\s*,\s*({[^}]+}))?/);

    if (matches) {
      this.filepath = matches[2];
      // If we have options JSON, parse it
      this.options = matches[3] ? JSON.parse(matches[3]) : {};
    } else {
      // Fallback to the old format: just a filepath
      this.filepath = argString.replace(/^['"]|['"]$/g, "");
      this.options = {};
    }
  },

  render(context) {
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
      if (!this.filepath) {
        throw new Error("No file path provided to asset tag");
      }

      // Get context globals
      const globals = context.globals || {};
      const apiUrl = globals.apiUrl || "";
      const activeProjectId = globals.projectId || "";
      const renderMode = globals.renderMode || "preview"; // Default to preview

      // Determine file type from extension
      const isCSS = this.filepath.endsWith(".css");
      const isJS = this.filepath.endsWith(".js");
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(this.filepath);

      let assetUrl;
      if (renderMode === "publish") {
        // For publish mode, use a relative path assuming all assets are in a top-level 'assets' folder
        assetUrl = `assets/${this.filepath}`;
      } else {
        // For preview mode, use the existing API route
        // Determine the source folder based on the current template context
        if (context.environments.widget && context.environments.widget.type) {
          // Inside a widget template: load from widgets/{widgetType}/
          const widgetType = context.environments.widget.type;
          assetUrl = `${apiUrl}/api/preview/assets/${activeProjectId}/widgets/${widgetType}/${this.filepath}`;
        } else {
          // In layout/snippets: load from assets/
          assetUrl = `${apiUrl}/api/preview/assets/${activeProjectId}/assets/${this.filepath}`;
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
      } = this.options;

      // Build attributes string
      let attributes = "";
      if (id) attributes += ` id="${id}"`;
      if (crossorigin) attributes += ` crossorigin="${crossorigin}"`;
      if (integrity) attributes += ` integrity="${integrity}"`;

      // For images, check if we have metadata in the context
      if (isImage && context.mediaDimensions && context.mediaDimensions[this.filepath]) {
        const imageData = context.mediaDimensions[this.filepath];
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
