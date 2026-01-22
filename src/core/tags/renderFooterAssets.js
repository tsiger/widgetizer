/**
 * {% footer_assets %} Liquid Tag
 *
 * Outputs all enqueued CSS and JS files marked for footer, sorted by priority.
 * Should be placed in layout.liquid before </body>.
 *
 * Usage:
 * {% footer_assets %}
 */
export const RenderFooterAssetsTag = {
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

      // Collect footer styles
      const footerStyles = [];
      if (styles && styles.size > 0) {
        styles.forEach((options, filepath) => {
          if (options.location === "footer") {
            footerStyles.push({ filepath, options });
          }
        });
      }

      // Collect footer scripts
      const footerScripts = [];
      if (scripts && scripts.size > 0) {
        scripts.forEach((options, filepath) => {
          if (options.location === "footer") {
            footerScripts.push({ filepath, options });
          }
        });
      }

      // Sort by priority (ascending - lower numbers first)
      footerStyles.sort((a, b) => a.options.priority - b.options.priority);
      footerScripts.sort((a, b) => a.options.priority - b.options.priority);

      // Render styles first (sorted)
      footerStyles.forEach(({ filepath, options }) => {
        let assetUrl;
        if (renderMode === "publish") {
          assetUrl = `assets/${filepath}`;
        } else if (options.source === "widget" && options.widgetType) {
          assetUrl = `${apiUrl}/api/preview/assets/${projectId}/widgets/${options.widgetType}/${filepath}`;
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
      footerScripts.forEach(({ filepath, options }) => {
        let assetUrl;
        if (renderMode === "publish") {
          assetUrl = `assets/${filepath}`;
        } else if (options.source === "widget" && options.widgetType) {
          assetUrl = `${apiUrl}/api/preview/assets/${projectId}/widgets/${options.widgetType}/${filepath}`;
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
      console.error("Error in footer_assets tag:", error);
      return `<!-- Error rendering footer assets: ${error.message} -->`;
    }
  },
};
