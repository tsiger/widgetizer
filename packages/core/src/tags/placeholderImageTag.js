import { Hash } from "liquidjs";

/**
 * {% placeholder_image %} Liquid Tag
 *
 * Outputs a placeholder image for development/preview purposes.
 * Supports multiple aspect ratios and theme-specific placeholders.
 *
 * Usage:
 * {% placeholder_image aspect: 'portrait' %}
 * {% placeholder_image aspect: 'square', class: '...' %}
 * {% placeholder_image src: 'custom.png' %}
 * {% placeholder_image src: 'custom.jpg', output: 'url' %}
 * {% placeholder_image aspect: 'landscape', output: 'url' %}
 *
 * Options:
 * - aspect: "landscape" (default), "portrait", "square"
 * - src: Custom placeholder file from assets
 * - output: "img" (default) or "url"
 * - class: CSS class
 * - style: Inline style
 * - alt: Alt text
 * - width: Width attribute
 * - height: Height attribute
 * - loading: Loading attribute
 */

const ASPECT_RATIOS = ["landscape", "portrait", "square"];
const PLACEHOLDER_FILES = {
  landscape: "placeholder.svg",
  portrait: "placeholder-portrait.svg",
  square: "placeholder-square.svg",
};

export const PlaceholderImageTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const {
      aspect = "landscape",
      src: customFile,
      output = "img",
      class: className = "",
      style = "",
      alt = "Placeholder",
      width = "",
      height = "",
      loading = "",
    } = options;

    const globals = context.globals || {};
    const apiUrl = globals.apiUrl || "";
    const projectId = globals.projectId || "";
    const renderMode = globals.renderMode || "preview";

    let assetUrl;

    if (customFile) {
      // Theme-specific placeholder from theme's assets folder
      if (renderMode === "publish") {
        assetUrl = `assets/${customFile}`;
      } else {
        assetUrl = `${apiUrl}/api/preview/assets/${projectId}/assets/${customFile}`;
      }
    } else {
      // Core placeholder based on aspect ratio
      const safeAspect = ASPECT_RATIOS.includes(aspect) ? aspect : "landscape";
      const placeholderFile = PLACEHOLDER_FILES[safeAspect];
      if (renderMode === "publish") {
        assetUrl = `assets/${placeholderFile}`;
      } else {
        assetUrl = `${apiUrl}/api/core/assets/${placeholderFile}`;
      }
    }

    // Output mode
    if (output === "url") {
      return assetUrl;
    }

    // Build img tag
    const classAttr = className ? ` class="${className}"` : "";
    const styleAttr = style ? ` style="${style}"` : "";
    const loadingAttr = loading ? ` loading="${loading}"` : "";
    const widthAttr = width ? ` width="${width}"` : "";
    const heightAttr = height ? ` height="${height}"` : "";
    const altAttr = ` alt="${alt}"`;

    return `<img src="${assetUrl}"${altAttr}${classAttr}${styleAttr}${loadingAttr}${widthAttr}${heightAttr}>`;
  },
};
