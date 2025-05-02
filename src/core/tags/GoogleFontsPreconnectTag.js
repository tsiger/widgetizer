// Purpose: Liquid tag to output Google Fonts preconnect links if needed.

import fontDefinitions from "../config/fonts.json" with { type: "json" };

const ALL_FONTS_LIST = [...fontDefinitions.system, ...fontDefinitions.google];

export const GoogleFontsPreconnectTag = {
  parse: function (tagToken, remainTokens) {
    //TODO: remainTokens is not used
    // No arguments expected
    this.tagName = tagToken.name;
  },
  render: function (context, hash) {
    //TODO: hash is not used
    const rawSettings = context.globals?.themeSettingsRaw;

    if (!rawSettings || !rawSettings.settings || !rawSettings.settings.global) {
      return ""; // No theme settings found
    }

    let googleFontFound = false;

    //TODO: We assume that there will be a typography category in the global settings.
    const typographySettings = rawSettings.settings.global.typography;

    if (Array.isArray(typographySettings)) {
      for (const setting of typographySettings) {
        if (setting.type === "font_picker") {
          const value =
            setting.value !== undefined
              ? setting.value
              : { stack: setting.default?.stack, weight: setting.default?.weight };
          // Ensure value has a stack property before proceeding
          if (value && typeof value === "object" && value.stack) {
            const fontInfo = ALL_FONTS_LIST.find((f) => f.stack === value.stack);
            if (fontInfo && fontInfo.isGoogleFont) {
              googleFontFound = true;
              break; // Stop checking once one is found
            }
          }
        }
      }
    }

    if (googleFontFound) {
      return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;
    } else {
      return ""; // No Google Fonts used
    }
  },
};
