/**
 * {% custom_css %} Liquid Tag
 *
 * Outputs custom CSS from theme settings wrapped in a <style> tag.
 * Should be placed in layout.liquid <head> section.
 *
 * Usage:
 * {% custom_css %}
 */
export const CustomCssTag = {
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

      const customCssSetting = advancedGroup.find((s) => s.id === "custom_css");

      if (!customCssSetting) {
        return "";
      }

      const cssValue = customCssSetting.value !== undefined ? customCssSetting.value : customCssSetting.default;

      if (!cssValue || typeof cssValue !== "string" || cssValue.trim() === "") {
        return "";
      }

      // Output CSS wrapped in a style tag
      return `<style id="custom-theme-css">\n${cssValue}\n</style>`;
    } catch (error) {
      console.error("Error in custom_css tag:", error);
      return `<!-- Error rendering custom CSS: ${error.message} -->`;
    }
  },
};
