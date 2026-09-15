import { PROFILE_NETWORKS, WEEKDAYS, normalizeSiteIdentity } from "@widgetizer/core/siteIdentity";

const LOCATION_FIELDS = ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"];

function dayToForm(ranges) {
  if (!Array.isArray(ranges)) return { mode: "unset", ranges: [] };
  if (ranges.length === 0) return { mode: "closed", ranges: [] };
  return { mode: "open", ranges: ranges.map(({ opens, closes }) => ({ opens: opens || "", closes: closes || "" })) };
}

/**
 * The stored site identity as flat form values. Only the primary location is
 * editable; any further locations ride along untouched in `extraLocations`.
 * @param {object} [identity]
 */
export function identityToForm(identity = {}) {
  const primary = identity?.locations?.[0] || {};
  return {
    category: identity?.category || "",
    logo: identity?.logo || "",
    email: identity?.email || "",
    telephone: identity?.telephone || "",
    priceRange: identity?.priceRange || "",
    publicName: identity?.text?.publicName || "",
    description: identity?.text?.description || "",
    profiles: Object.fromEntries(PROFILE_NETWORKS.map((network) => [network, identity?.profiles?.[network] || ""])),
    location: {
      ...Object.fromEntries(LOCATION_FIELDS.map((field) => [field, primary[field] || ""])),
      label: primary.text?.label || "",
    },
    hours: Object.fromEntries(WEEKDAYS.map((day) => [day, dayToForm(primary.openingHours?.[day])])),
    extraLocations: Array.isArray(identity?.locations) ? identity.locations.slice(1) : [],
  };
}

/**
 * Form values back to the stored shape, through the same core validation the
 * server runs. Error paths match the stored shape (`locations.0.postalCode`).
 * @param {object} [form]
 * @returns {{ value: object, errors: Array<{ field: string, code: string }> }}
 */
export function formToIdentity(form = {}) {
  const openingHours = {};
  for (const day of WEEKDAYS) {
    const entry = form.hours?.[day];
    if (entry?.mode === "closed") {
      openingHours[day] = [];
    } else if (entry?.mode === "open") {
      const ranges = (entry.ranges || []).filter((range) => range.opens || range.closes);
      if (ranges.length) openingHours[day] = ranges;
    }
  }

  const location = form.location || {};
  const primary = {
    ...Object.fromEntries(LOCATION_FIELDS.map((field) => [field, location[field]])),
    openingHours,
    text: { label: location.label },
  };
  const extraLocations = Array.isArray(form.extraLocations) ? form.extraLocations : [];
  const hasText = (value) => typeof value === "string" && value.trim() !== "";
  const primaryHasContent =
    LOCATION_FIELDS.some((field) => hasText(location[field])) || hasText(location.label) || Object.keys(openingHours).length > 0;

  const result = normalizeSiteIdentity({
    category: form.category,
    logo: form.logo,
    email: form.email,
    telephone: form.telephone,
    priceRange: form.priceRange,
    profiles: form.profiles,
    locations: [primary, ...extraLocations],
    text: { publicName: form.publicName, description: form.description },
  });

  // An emptied primary is pruned, which would silently publish the next,
  // uneditable location in its place.
  if (!primaryHasContent && extraLocations.length > 0) {
    result.errors.push({ field: "locations.0.streetAddress", code: "primaryRequired" });
  }
  return result;
}

/**
 * The first error at or under a path, for showing it next to its field.
 * @param {Array<{ field: string, code: string }>} errors
 * @param {string} path
 */
export function identityErrorAt(errors, path) {
  return (errors || []).find((error) => error.field === path || error.field.startsWith(`${path}.`)) || null;
}
