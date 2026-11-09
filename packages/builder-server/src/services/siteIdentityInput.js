// Reading the business details (site identity) a request sends.
import { normalizeSiteIdentity } from "@widgetizer/core/siteIdentity";
import { stripHtmlToText } from "./sanitizationService.js";

function stripTextFields(group, keys) {
  if (!group || typeof group !== "object" || Array.isArray(group)) return group;
  const stripped = { ...group };
  for (const key of keys) {
    if (typeof stripped[key] === "string") stripped[key] = stripHtmlToText(stripped[key]);
  }
  return stripped;
}

/**
 * The site identity a request sent, ready to store: only human-readable text is
 * tag-stripped. URLs, email, phone and the logo path are left exactly as sent for
 * core to accept or refuse: stripping re-serialises through DOMPurify, which would
 * silently rewrite a query string. Then core's normalizeSiteIdentity validates and
 * trims it.
 * @param {unknown} raw  the `siteIdentity` a request sent
 * @returns {{ value: object, errors: Array<{ field: string, code: string }> }}
 */
export function readSiteIdentity(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return normalizeSiteIdentity(raw);
  const identity = stripTextFields(raw, ["priceRange"]);
  identity.text = stripTextFields(raw.text, ["publicName", "description"]);
  if (Array.isArray(raw.locations)) {
    identity.locations = raw.locations.map((location) => {
      const stripped = stripTextFields(location, ["streetAddress", "addressLocality", "addressRegion", "postalCode"]);
      if (stripped !== location) stripped.text = stripTextFields(location.text, ["label"]);
      return stripped;
    });
  }
  return normalizeSiteIdentity(identity);
}
