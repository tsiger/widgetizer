// Purpose: Liquid tag to output both font preconnect links and stylesheet for optimal font loading.

import { collectThemeFonts, themeFontsStylesheetUrl } from "../utils/themeFonts.js";

export const FontsTag = {
  parse(tagToken) {
    this.tagName = tagToken.name;
  },

  render(context) {
    const rawSettings = context.globals?.themeSettingsRaw;
    if (!rawSettings?.settings?.global) return "";

    const themeFonts = collectThemeFonts(rawSettings);
    const url = themeFontsStylesheetUrl(themeFonts);
    if (!url) return "";

    const preconnect = themeFonts.useBunnyFonts
      ? `<link rel="preconnect" href="https://fonts.bunny.net">
`
      : `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`;

    return `${preconnect}<link href="${url}" rel="stylesheet">`;
  },
};
