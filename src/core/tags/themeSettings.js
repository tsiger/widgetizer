export const ThemeSettingsTag = {
  parse: function (tagToken, remainTokens) {
    //TODO: remainTokens is not used
    // No arguments expected for this tag
    this.tagName = tagToken.name;
  },
  render: function (context, hash) {
    //TODO: hash is not used
    // Check context.globals for raw settings
    const rawSettings = context.globals?.themeSettingsRaw;

    if (!rawSettings || !rawSettings.settings || !rawSettings.settings.global) {
      return ""; // Return empty string if no settings found
    }

    const cssVariables = {};
    const globalSettings = rawSettings.settings.global;

    // Process each category (e.g., colors, typography)
    Object.entries(globalSettings).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach((item) => {
          // Handle font_picker type specifically
          if (item.type === "font_picker") {
            const value = item.value !== undefined ? item.value : item.default;
            // Ensure value is the expected object { stack, weight }
            if (value && typeof value === "object" && value.stack && value.weight !== undefined) {
              const cssVarBase = `--${category}-${item.id}`;
              cssVariables[`${cssVarBase}-family`] = value.stack;
              cssVariables[`${cssVarBase}-weight`] = value.weight;
            }
          }
          // Handle other types marked for CSS variable output
          else if (item.id && item.outputAsCssVar === true) {
            // Use value if present, otherwise use default
            const value = item.value !== undefined ? item.value : item.default;
            if (value !== undefined) {
              // Construct the CSS variable name
              cssVariables[`--${category}-${item.id}`] = value;
            }
          }
        });
      }
    });

    if (Object.keys(cssVariables).length === 0) {
      return "";
    }

    // Format as CSS string
    const cssString = Object.entries(cssVariables)
      .map(([key, value]) => `${key}: ${value};`)
      .join("\n  ");

    const output = `<style id="theme-settings-styles">\n:root {\n  ${cssString}\n}\n</style>`;

    return output;
  },
};
