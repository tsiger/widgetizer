/**
 * {% render_styles %} Liquid Tag
 *
 * Outputs all enqueued CSS files as <link> tags.
 * Should be placed in layout.liquid <head> section.
 *
 * Usage:
 * {% render_styles %}
 */
export const RenderStylesTag = {
  parse() {
    // No arguments
  },

  render(context) {
    try {
      const styles = context.globals?.enqueuedStyles;
      if (!styles || styles.size === 0) {
        return "";
      }

      const globals = context.globals || {};
      const apiUrl = globals.apiUrl || "";
      const projectId = globals.projectId || "";
      const renderMode = globals.renderMode || "preview";

      let output = "";

      styles.forEach((options, filepath) => {
        let assetUrl;
        if (renderMode === "publish") {
          // For publish mode, use relative path
          assetUrl = `assets/${filepath}`;
        } else {
          // For preview mode, use the API route
          assetUrl = `${apiUrl}/api/preview/assets/${projectId}/assets/${filepath}`;
        }

        let tag = `<link rel="stylesheet" href="${assetUrl}"`;
        if (options.media) tag += ` media="${options.media}"`;
        if (options.id) tag += ` id="${options.id}"`;
        tag += ">";

        output += tag + "\n";
      });

      return output;
    } catch (error) {
      console.error("Error in render_styles tag:", error);
      return `<!-- Error rendering enqueued styles: ${error.message} -->`;
    }
  },
};
