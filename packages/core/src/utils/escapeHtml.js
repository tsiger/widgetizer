/**
 * Escape a value for interpolation into HTML text or a quoted attribute.
 *
 * Pure string work — no DOM, no Node built-ins — so it is safe in the browser
 * bundle, in Electron, and on the server alike. Escaping both quote characters
 * is what makes it safe inside `attr="..."` as well as between tags; escaping
 * `&` first matters, or the entities produced below get double-escaped.
 *
 * Non-strings become "" rather than "undefined"/"[object Object]", so an absent
 * value can never inject a literal into the output.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
