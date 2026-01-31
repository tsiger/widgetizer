/**
 * {% placeholder_image %} Liquid Tag
 *
 * Outputs a placeholder image for development/preview purposes.
 * Supports multiple aspect ratios and theme-specific placeholders.
 *
 * Usage:
 * {% placeholder_image %}                              - Landscape placeholder as <img> (default)
 * {% placeholder_image 'portrait' %}                   - Portrait placeholder as <img>
 * {% placeholder_image 'square' %}                     - Square placeholder as <img>
 * {% placeholder_image 'url' %}                        - Landscape placeholder URL only
 * {% placeholder_image 'portrait', 'url' %}            - Portrait placeholder URL only
 * {% placeholder_image 'square', { "class": "..." } %} - Square with options
 * {% placeholder_image 'custom.png' %}                 - Theme asset as <img>
 * {% placeholder_image 'custom.jpg', 'url' %}          - Theme asset URL only
 *
 * Aspect ratios:
 * - landscape: 16:9 (1600x900) - default
 * - portrait: 9:16 (900x1600)
 * - square: 1:1 (1200x1200)
 *
 * Supported custom formats: svg, jpg, jpeg, png, gif, webp
 */

const SUPPORTED_FORMATS = /\.(svg|jpe?g|png|gif|webp)$/i;
const ASPECT_RATIOS = ["landscape", "portrait", "square"];
const PLACEHOLDER_FILES = {
  landscape: "placeholder.svg",
  portrait: "placeholder-portrait.svg",
  square: "placeholder-square.svg",
};

export const PlaceholderImageTag = {
  parse(tagToken) {
    this.args = tagToken.args.trim();

    // Parse arguments
    this.customFile = null;
    this.aspect = "landscape"; // default
    this.outputMode = "img"; // 'img' or 'url'
    this.options = {};

    if (!this.args) {
      // No arguments - landscape placeholder as img
      return;
    }

    // Match patterns
    const stringMatch = this.args.match(/^['"]([^'"]+)['"]/);

    if (stringMatch) {
      const firstArg = stringMatch[1];

      // Check what type of first argument this is
      if (firstArg === "url") {
        this.outputMode = "url";
      } else if (ASPECT_RATIOS.includes(firstArg)) {
        this.aspect = firstArg;
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
            console.warn("placeholder_image: Failed to parse options JSON", {
              args: this.args,
              secondPart: secondPart,
              error: e.message,
            });
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
        // Core placeholder based on aspect ratio
        const placeholderFile = PLACEHOLDER_FILES[this.aspect];
        if (renderMode === "publish") {
          assetUrl = `assets/${placeholderFile}`;
        } else {
          assetUrl = `${apiUrl}/api/core/assets/${placeholderFile}`;
        }
      }

      // Output mode
      if (this.outputMode === "url") {
        return assetUrl;
      }

      // Build img tag
      const classAttr = this.options.class ? ` class="${this.options.class}"` : "";
      const styleAttr = this.options.style ? ` style="${this.options.style}"` : "";
      const loading = this.options.loading ? ` loading="${this.options.loading}"` : "";
      const width = this.options.width ? ` width="${this.options.width}"` : "";
      const height = this.options.height ? ` height="${this.options.height}"` : "";
      const altText = this.options.alt !== undefined ? this.options.alt : "Placeholder";

      return `<img src="${assetUrl}" alt="${altText}"${classAttr}${styleAttr}${loading}${width}${height}>`;
    } catch (error) {
      console.error("Error in placeholder_image tag:", error);
      return `<!-- Error in placeholder_image: ${error.message} -->`;
    }
  },
};
