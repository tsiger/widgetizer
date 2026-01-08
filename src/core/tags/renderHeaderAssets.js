/**
 * {% header_assets %} Liquid Tag
 *
 * Outputs all enqueued CSS and JS files marked for header, sorted by priority.
 * Should be placed in layout.liquid <head> section.
 *
 * Usage:
 * {% header_assets %}
 */
export const RenderHeaderAssetsTag = {
  parse() {
    // No arguments
  },

  render(context) {
    try {
      const styles = context.globals?.enqueuedStyles;
      const scripts = context.globals?.enqueuedScripts;

      const globals = context.globals || {};
      const apiUrl = globals.apiUrl || "";
      const projectId = globals.projectId || "";
      const renderMode = globals.renderMode || "preview";

      let output = "";

      // Collect header styles
      const headerStyles = [];
      if (styles && styles.size > 0) {
        styles.forEach((options, filepath) => {
          if (options.location === "header") {
            headerStyles.push({ filepath, options });
          }
        });
      }

      // Collect header scripts
      const headerScripts = [];
      if (scripts && scripts.size > 0) {
        scripts.forEach((options, filepath) => {
          if (options.location === "header") {
            headerScripts.push({ filepath, options });
          }
        });
      }

      // Sort by priority (ascending - lower numbers first)
      headerStyles.sort((a, b) => a.options.priority - b.options.priority);
      headerScripts.sort((a, b) => a.options.priority - b.options.priority);

      // Render styles first (sorted)
      headerStyles.forEach(({ filepath, options }) => {
        let assetUrl;
        if (renderMode === "publish") {
          assetUrl = `assets/${filepath}`;
        } else {
          assetUrl = `${apiUrl}/api/preview/assets/${projectId}/assets/${filepath}`;
        }

        let tag = `<link rel="stylesheet" href="${assetUrl}"`;
        if (options.media) tag += ` media="${options.media}"`;
        if (options.id) tag += ` id="${options.id}"`;
        tag += ">";

        output += tag + "\n";
      });

      // Render scripts second (sorted)
      headerScripts.forEach(({ filepath, options }) => {
        let assetUrl;
        if (renderMode === "publish") {
          assetUrl = `assets/${filepath}`;
        } else {
          assetUrl = `${apiUrl}/api/preview/assets/${projectId}/assets/${filepath}`;
        }

        let tag = `<script src="${assetUrl}"`;
        if (options.defer === true) tag += " defer";
        if (options.async === true) tag += " async";
        tag += "></script>";

        output += tag + "\n";
      });

      return output;
    } catch (error) {
      console.error("Error in header_assets tag:", error);
      return `<!-- Error rendering header assets: ${error.message} -->`;
    }
  },
};
