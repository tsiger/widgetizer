import fontDefinitions from "../config/fonts.json" with { type: "json" };
import { readThemeSetting, themeSettingsOfType } from "./themeSettingChanges.js";

const ALL_FONTS_LIST = [...fontDefinitions.system, ...fontDefinitions.google];

/**
 * The web fonts a theme's font pickers need, from any settings group: a map of
 * font name to sorted weights, plus whether to load them from Bunny Fonts.
 * A `body_font` at 400 also loads the best bold its family offers — the weight
 * `{% theme_settings %}` names in its bold variable — so bold text is not
 * synthesised.
 *
 * @returns {{ fonts: Record<string, number[]>, useBunnyFonts: boolean }}
 */
export function collectThemeFonts(theme) {
  const weightsByFont = {};

  for (const setting of themeSettingsOfType(theme, "font_picker")) {
    const value = setting.value !== undefined ? setting.value : setting.default;
    if (!value || typeof value !== "object" || !value.stack || !value.weight) continue;
    const fontInfo = ALL_FONTS_LIST.find((font) => font.stack === value.stack);
    if (!fontInfo?.isGoogleFont) continue;

    const weights = (weightsByFont[fontInfo.name] ??= new Set());
    weights.add(value.weight);
    if (setting.id === "body_font" && value.weight === 400) {
      const available = fontInfo.availableWeights || [];
      const bold = [700, 600, 500].find((weight) => available.includes(weight));
      if (bold) weights.add(bold);
    }
  }

  const fonts = Object.fromEntries(
    Object.entries(weightsByFont).map(([name, weights]) => [name, [...weights].sort((a, b) => a - b)]),
  );
  const useBunnyFonts = Boolean(readThemeSetting(theme, { group: "advanced", id: "use_bunny_fonts" }));
  return { fonts, useBunnyFonts };
}

/** The stylesheet URL for `collectThemeFonts`' result, or "" when there is nothing to load. */
export function themeFontsStylesheetUrl({ fonts, useBunnyFonts }) {
  const entries = Object.entries(fonts || {});
  if (entries.length === 0) return "";

  // Bunny speaks the v1 API (`Name:400,700`, families joined by "|") and silently
  // serves only 400 for Google's `wght@` syntax.
  if (useBunnyFonts) {
    const families = entries.map(([name, weights]) => `${encodeURIComponent(name)}:${weights.join(",")}`);
    return `https://fonts.bunny.net/css?family=${families.join("|")}&display=swap`;
  }
  const families = entries.map(([name, weights]) => `family=${encodeURIComponent(name)}:wght@${weights.join(";")}`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
