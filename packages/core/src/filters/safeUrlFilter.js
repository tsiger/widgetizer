/**
 * safe_url filter
 *
 * Blocks dangerous URL schemes (javascript:/data:/vbscript:, including
 * tab/newline/control-char-obfuscated variants) in author-entered URLs that a
 * theme emits into an href. Returns "" for an unsafe URL. Apply it wherever a
 * template outputs an author-controlled URL into an attribute:
 *
 *   <a href="{{ social.facebook_url | safe_url }}">
 *
 * Setting type "link" and menu links are already sanitized server-side; this is
 * for plain text/URL values emitted directly by theme templates.
 */
import { sanitizeHref } from "../utils/urlSafety.js";

export function registerSafeUrlFilter(engine) {
  engine.registerFilter("safe_url", (value) => sanitizeHref(typeof value === "string" ? value : ""));
}
