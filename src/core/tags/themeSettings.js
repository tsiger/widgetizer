import fontDefinitions from "../config/fonts.json" with { type: "json" };

const ALL_FONTS_LIST = [...fontDefinitions.system, ...fontDefinitions.google];

export const ThemeSettingsTag = {
  // eslint-disable-next-line no-unused-vars
  parse: function (tagToken, remainTokens) {
    // No arguments expected for this tag
    this.tagName = tagToken.name;
  },
  // eslint-disable-next-line no-unused-vars
  render: function (context, hash) {
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

              // Smart bold weight calculation for body_font
              if (item.id === "body_font" && value.weight === 400) {
                const fontInfo = ALL_FONTS_LIST.find((f) => f.stack === value.stack);
                if (fontInfo && fontInfo.isGoogleFont) {
                  const availableWeights = fontInfo.availableWeights || [];

                  // Find best bold weight: 700 > 600 > 500
                  let boldWeight = 700; // Default fallback
                  if (availableWeights.includes(700)) boldWeight = 700;
                  else if (availableWeights.includes(600)) boldWeight = 600;
                  else if (availableWeights.includes(500)) boldWeight = 500;

                  cssVariables[`--${category}-${item.id}_bold-weight`] = boldWeight;
                }
              } else if (item.id === "body_font") {
                // For non-400 weights, use the selected weight as bold
                cssVariables[`--${category}-${item.id}_bold-weight`] = value.weight;
              }
            }
          }
          // Handle other types marked for CSS variable output
          else if (item.id && item.outputAsCssVar === true) {
            // Use value if present, otherwise use default
            let value = item.value !== undefined ? item.value : item.default;
            if (value !== undefined) {
              // For range inputs with units, append the unit to the value
              if (item.type === "range" && item.unit && typeof value === "number") {
                value = `${value}${item.unit}`;
              }
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
