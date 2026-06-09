import { Hash } from "liquidjs";

export const AssetTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    /**
     * The asset tag is used to include CSS, JavaScript, and other assets in templates.
     *
     * Usage:
     * {% asset src: "filename.css" %}
     * {% asset src: "filename.js", defer: true, async: true %}
     *
     * Options:
     * - src: The filename of the asset (required)
     * - defer: boolean (default: false), opt-in
     * - async: boolean (default: false), opt-in
     * - crossorigin: string (default: null)
     * - integrity: string (default: null)
     * - media: string (default: null) for CSS
     * - id: string (default: null)
     */
    const options = yield this.hash.render(context);
    const {
      src: filepath,
      defer = false,
      async = false,
      crossorigin = null,
      integrity = null,
      media = null,
      id = null,
    } = options;

    if (!filepath) {
      console.warn("Asset tag: No 'src' provided");
      return "";
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
      // Add cache busting version for CSS and JS files
      const version = globals.exportVersion;
      if ((isCSS || isJS) && version) {
        assetUrl = `assets/${filepath}?v=${version}`;
      } else {
        assetUrl = `assets/${filepath}`;
      }
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
  },
};
