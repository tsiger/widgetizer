// Purpose: Liquid tag to output both font preconnect links and stylesheet for optimal font loading.

import fontDefinitions from "../config/fonts.json" with { type: "json" };

const ALL_FONTS_LIST = [...fontDefinitions.system, ...fontDefinitions.google];

export const FontsTag = {
  parse: function (tagToken, remainTokens) {
    // No arguments expected
    this.tagName = tagToken.name;
  },
  render: function (context, hash) {
    const rawSettings = context.globals?.themeSettingsRaw;

    if (!rawSettings || !rawSettings.settings || !rawSettings.settings.global) {
      return ""; // No theme settings found
    }

    const fontsToLoad = {}; // { FontName: Set(weight) }
    const typographySettings = rawSettings.settings.global.typography;

    if (Array.isArray(typographySettings)) {
      for (const setting of typographySettings) {
        if (setting.type === "font_picker") {
          // Prioritize saved value, then default value from schema
          const value =
            setting.value !== undefined
              ? setting.value
              : { stack: setting.default?.stack, weight: setting.default?.weight };

          // Ensure value is an object with stack and weight
          if (value && typeof value === "object" && value.stack) {
            const fontInfo = ALL_FONTS_LIST.find((f) => f.stack === value.stack);

            if (fontInfo && fontInfo.isGoogleFont && value.weight) {
              const fontName = fontInfo.name; // Use the font name for the URL

              if (!fontsToLoad[fontName]) {
                fontsToLoad[fontName] = new Set();
              }
              fontsToLoad[fontName].add(value.weight);
            }
          }
        }
      }
    }

    if (Object.keys(fontsToLoad).length === 0) {
      return ""; // No Google Fonts to load
    }

    // Build output: preconnect links + stylesheet link
    let output = "";

    // 1. Preconnect links for performance
    output += `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`;

    // 2. Stylesheet link
    const base = "https://fonts.googleapis.com/css2";
    const families = Object.entries(fontsToLoad)
      .map(([name, weightsSet]) => {
        const weights = Array.from(weightsSet).sort((a, b) => a - b); // Sort weights numerically
        // URL encode name, join weights with semicolon
        return `family=${encodeURIComponent(name)}:wght@${weights.join(";")}`;
      })
      .join("&");

    const url = `${base}?${families}&display=swap`;
    output += `<link href="${url}" rel="stylesheet">`;

    return output;
  },
};
