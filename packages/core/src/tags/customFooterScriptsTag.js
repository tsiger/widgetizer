/**
 * {% custom_footer_scripts %} Liquid Tag
 *
 * Outputs custom scripts from theme settings as raw HTML.
 * Should be placed in layout.liquid before the closing </body> tag.
 *
 * Usage:
 * {% custom_footer_scripts %}
 *
 * Note: This tag outputs raw HTML without any wrapping tags.
 * Users can paste complete script tags.
 */
export const CustomFooterScriptsTag = {
  parse(tagToken) {
    this.tagName = tagToken.name;
  },

  render(context) {
    try {
      const rawSettings = context.globals?.themeSettingsRaw;

      if (!rawSettings || !rawSettings.settings || !rawSettings.settings.global) {
        return ""; // Return empty string if no settings found
      }

      const advancedGroup = rawSettings.settings.global.advanced;

      if (!Array.isArray(advancedGroup)) {
        return "";
      }

      const customFooterScriptsSetting = advancedGroup.find((s) => s.id === "custom_footer_scripts");

      if (!customFooterScriptsSetting) {
        return "";
      }

      const scriptsValue =
        customFooterScriptsSetting.value !== undefined
          ? customFooterScriptsSetting.value
          : customFooterScriptsSetting.default;

      if (!scriptsValue || typeof scriptsValue !== "string" || scriptsValue.trim() === "") {
        return "";
      }

      // Output raw HTML (no wrapping tags)
      return scriptsValue;
    } catch (error) {
      console.error("Error in custom_footer_scripts tag:", error);
      return `<!-- Error rendering custom footer scripts: ${error.message} -->`;
    }
  },
};
