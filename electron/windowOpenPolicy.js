/**
 * Where a `window.open` / `target="_blank"` URL goes. Pages served by the app's own
 * server (an export, a media file) open in a plain app window with no preload;
 * other web addresses open in the browser; anything else is refused.
 *
 * @param {string} url
 * @param {string[]} contentOrigins - the app server's origins
 * @returns {"content"|"external"|"deny"}
 */
export function windowOpenTarget(url, contentOrigins) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "deny";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "deny";
  return contentOrigins.includes(parsed.origin) ? "content" : "external";
}
