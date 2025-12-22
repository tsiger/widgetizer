/**
 * {% render_scripts %} Liquid Tag
 *
 * Outputs all enqueued JS files as <script> tags.
 * Should be placed in layout.liquid before </body>.
 *
 * Usage:
 * {% render_scripts %}
 */
export const RenderScriptsTag = {
  parse() {
    // No arguments
  },

  render(context) {
    try {
      const scripts = context.globals?.enqueuedScripts;
      if (!scripts || scripts.size === 0) {
        return "";
      }

      const globals = context.globals || {};
      const apiUrl = globals.apiUrl || "";
      const projectId = globals.projectId || "";
      const renderMode = globals.renderMode || "preview";

      let output = "";

      scripts.forEach((options, filepath) => {
        let assetUrl;
        if (renderMode === "publish") {
          // For publish mode, use relative path
          assetUrl = `assets/${filepath}`;
        } else {
          // For preview mode, use the API route
          assetUrl = `${apiUrl}/api/preview/assets/${projectId}/assets/${filepath}`;
        }

        let tag = `<script src="${assetUrl}"`;
        if (options.defer) tag += " defer";
        if (options.async) tag += " async";
        tag += "></script>";

        output += tag + "\n";
      });

      return output;
    } catch (error) {
      console.error("Error in render_scripts tag:", error);
      return `<!-- Error rendering enqueued scripts: ${error.message} -->`;
    }
  },
};
