/**
 * {% custom_head_scripts %} Liquid Tag
 *
 * Outputs custom scripts from theme settings as raw HTML.
 * Should be placed in layout.liquid <head> section.
 *
 * Usage:
 * {% custom_head_scripts %}
 *
 * Note: This tag outputs raw HTML without any wrapping tags.
 * Users can paste complete script tags (e.g., Google Analytics).
 */
export const CustomHeadScriptsTag = {
  parse() {
    // No arguments expected for this tag
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

      const customHeadScriptsSetting = advancedGroup.find((s) => s.id === "custom_head_scripts");

      if (!customHeadScriptsSetting) {
        return "";
      }

      const scriptsValue =
        customHeadScriptsSetting.value !== undefined
          ? customHeadScriptsSetting.value
          : customHeadScriptsSetting.default;

      if (!scriptsValue || typeof scriptsValue !== "string" || scriptsValue.trim() === "") {
        return "";
      }

      // Output raw HTML (no wrapping tags)
      return scriptsValue;
    } catch (error) {
      console.error("Error in custom_head_scripts tag:", error);
      return `<!-- Error rendering custom head scripts: ${error.message} -->`;
    }
  },
};
