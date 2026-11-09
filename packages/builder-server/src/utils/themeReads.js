// The site settings each widget and the layout read, for the editor's live
// updates: embedded in the preview document as JSON, which the preview runtime
// hands over with PREVIEW_READY. "<" is escaped so the JSON can't close the
// script element it sits in.
export function injectThemeReads(html, themeReads) {
  const json = JSON.stringify(themeReads || {}).replace(/</g, "\\u003c");
  return html.replace(/<\/body>/i, `<script type="application/json" id="widgetizer-theme-reads">${json}</script>\n</body>`);
}
