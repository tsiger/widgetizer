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
    
    // Track body font for smart bold loading
    let bodyFontName = null;
    let bodyFontWeight = null;
    let bodyFontInfo = null;

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
              
              // Track body font for smart bold loading
              if (setting.id === "body_font") {
                bodyFontName = fontName;
                bodyFontWeight = value.weight;
                bodyFontInfo = fontInfo;
              }
            }
          }
        }
      }
    }
    
    // Smart bold weight loading for body font
    // If body font is normal (400), auto-load a proper bold weight to prevent faux-bold
    if (bodyFontName && bodyFontWeight === 400 && bodyFontInfo) {
      const availableWeights = bodyFontInfo.availableWeights || [];
      
      // Find best bold weight: 700 (bold) > 600 (semibold) > 500 (medium)
      let boldWeight = null;
      if (availableWeights.includes(700)) boldWeight = 700;
      else if (availableWeights.includes(600)) boldWeight = 600;
      else if (availableWeights.includes(500)) boldWeight = 500;
      
      if (boldWeight) {
        fontsToLoad[bodyFontName].add(boldWeight);
      }
    }

    if (Object.keys(fontsToLoad).length === 0) {
      return ""; // No Google Fonts to load
    }

    // Check if user enabled privacy-friendly font CDN (Bunny Fonts)
    const privacySettings = rawSettings?.settings?.global?.privacy;
    const useBunnyFonts = Array.isArray(privacySettings)
      ? privacySettings.find(s => s.id === 'use_bunny_fonts')?.value || false
      : false;

    // Build output: preconnect links + stylesheet link
    let output = "";

    // 1. Preconnect links for performance (different for each CDN)
    if (useBunnyFonts) {
      output += `<link rel="preconnect" href="https://fonts.bunny.net">
`;
    } else {
      output += `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`;
    }

    // 2. Stylesheet link
    // Bunny Fonts uses v1 API (pipe-separated), Google uses v2 API (ampersand-separated)
    let url;
    
    if (useBunnyFonts) {
      // Bunny Fonts v1 API format: family=Font1:wght@400;700|Font2:wght@400
      const base = "https://fonts.bunny.net/css";
      const families = Object.entries(fontsToLoad)
        .map(([name, weightsSet]) => {
          const weights = Array.from(weightsSet).sort((a, b) => a - b);
          return `${encodeURIComponent(name)}:wght@${weights.join(";")}`;
        })
        .join("|"); // Pipe separator for v1 API
      
      url = `${base}?family=${families}&display=swap`;
    } else {
      // Google Fonts v2 API format: family=Font1:wght@400;700&family=Font2:wght@400
      const base = "https://fonts.googleapis.com/css2";
      const families = Object.entries(fontsToLoad)
        .map(([name, weightsSet]) => {
          const weights = Array.from(weightsSet).sort((a, b) => a - b);
          return `family=${encodeURIComponent(name)}:wght@${weights.join(";")}`;
        })
        .join("&"); // Ampersand separator for v2 API
      
      url = `${base}?${families}&display=swap`;
    }
    
    output += `<link href="${url}" rel="stylesheet">`;

    return output;
  },
};
