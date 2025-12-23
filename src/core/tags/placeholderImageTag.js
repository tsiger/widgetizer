/**
 * {% placeholder_image %} Liquid Tag
 *
 * Outputs a placeholder image for development/preview purposes.
 * Supports both core placeholder and theme-specific placeholders.
 *
 * Usage:
 * {% placeholder_image %}                              - Core placeholder as <img>
 * {% placeholder_image 'url' %}                        - Core placeholder URL only
 * {% placeholder_image 'custom.png' %}                 - Theme asset as <img>
 * {% placeholder_image 'custom.jpg', 'url' %}          - Theme asset URL only
 * {% placeholder_image 'custom.svg', { "alt": "..." } %} - Theme asset with options
 *
 * Supported formats: svg, jpg, jpeg, png, gif, webp
 */

const SUPPORTED_FORMATS = /\.(svg|jpe?g|png|gif|webp)$/i;
const CORE_PLACEHOLDER = "placeholder.svg";

export const PlaceholderImageTag = {
  parse(tagToken) {
    this.args = tagToken.args.trim();

    // Parse arguments
    // Possible patterns:
    // - No args: use core placeholder, output img
    // - 'url': use core placeholder, output url
    // - 'filename.ext': use theme asset, output img
    // - 'filename.ext', 'url': use theme asset, output url
    // - 'filename.ext', { options }: use theme asset, output img with options
    // - 'url', { options }: invalid but we'll handle gracefully

    this.customFile = null;
    this.outputMode = "img"; // 'img' or 'url'
    this.options = {};

    if (!this.args) {
      // No arguments - core placeholder as img
      return;
    }

    // Match patterns
    const stringMatch = this.args.match(/^['"]([^'"]+)['"]/);

    if (stringMatch) {
      const firstArg = stringMatch[1];

      // Check if first arg is 'url' (output mode) or a filename
      if (firstArg === "url") {
        this.outputMode = "url";
      } else if (SUPPORTED_FORMATS.test(firstArg)) {
        this.customFile = firstArg;
      }

      // Check for second argument
      const remaining = this.args.slice(stringMatch[0].length).trim();

      if (remaining.startsWith(",")) {
        const secondPart = remaining.slice(1).trim();

        // Check if it's 'url' or an options object
        const secondStringMatch = secondPart.match(/^['"]([^'"]+)['"]/);
        if (secondStringMatch && secondStringMatch[1] === "url") {
          this.outputMode = "url";
        } else if (secondPart.startsWith("{")) {
          // Parse options JSON
          try {
            this.options = JSON.parse(secondPart);
          } catch (e) {
            console.warn("placeholder_image: Failed to parse options JSON");
          }
        }
      }
    }
  },

  render(context) {
    try {
      const globals = context.globals || {};
      const apiUrl = globals.apiUrl || "";
      const projectId = globals.projectId || "";
      const renderMode = globals.renderMode || "preview";

      let assetUrl;

      if (this.customFile) {
        // Theme-specific placeholder from theme's assets folder
        if (renderMode === "publish") {
          assetUrl = `assets/${this.customFile}`;
        } else {
          assetUrl = `${apiUrl}/api/preview/assets/${projectId}/assets/${this.customFile}`;
        }
      } else {
        // Core placeholder
        if (renderMode === "publish") {
          assetUrl = `assets/${CORE_PLACEHOLDER}`;
        } else {
          // Serve from core assets (we'll need to add a route for this)
          assetUrl = `${apiUrl}/api/core/assets/${CORE_PLACEHOLDER}`;
        }
      }

      // Output mode
      if (this.outputMode === "url") {
        return assetUrl;
      }

      // Build img tag
      const alt = this.options.alt || "Placeholder image";
      const classAttr = this.options.class ? ` class="${this.options.class}"` : "";
      const loading = this.options.loading ? ` loading="${this.options.loading}"` : "";
      const width = this.options.width ? ` width="${this.options.width}"` : "";
      const height = this.options.height ? ` height="${this.options.height}"` : "";

      return `<img src="${assetUrl}" alt="${alt}"${classAttr}${loading}${width}${height}>`;
    } catch (error) {
      console.error("Error in placeholder_image tag:", error);
      return `<!-- Error in placeholder_image: ${error.message} -->`;
    }
  },
};
