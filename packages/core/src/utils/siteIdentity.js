import { isValidSiteUrl } from "./urlSafety.js";

const category = (id, schemaType, kind) => Object.freeze({ id, schemaType, kind });

// Kind is declared per row, not derived from the schema.org hierarchy:
// VeterinaryCare, for one, sits outside LocalBusiness there.
export const SITE_IDENTITY_CATEGORIES = Object.freeze([
  category("organization", "Organization", "organization"),
  category("person", "Person", "person"),
  category("local-business", "LocalBusiness", "localBusiness"),
  category("accounting", "AccountingService", "localBusiness"),
  category("auto-repair", "AutoRepair", "localBusiness"),
  category("bakery", "Bakery", "localBusiness"),
  category("bed-and-breakfast", "BedAndBreakfast", "localBusiness"),
  category("cleaning-service", "LocalBusiness", "localBusiness"),
  category("coffee-shop", "CafeOrCoffeeShop", "localBusiness"),
  category("consulting", "LocalBusiness", "localBusiness"),
  category("day-spa", "DaySpa", "localBusiness"),
  category("daycare", "ChildCare", "localBusiness"),
  category("dentist", "Dentist", "localBusiness"),
  category("florist", "Florist", "localBusiness"),
  category("general-contractor", "GeneralContractor", "localBusiness"),
  category("graphic-design", "LocalBusiness", "localBusiness"),
  category("gym", "ExerciseGym", "localBusiness"),
  category("hair-salon", "HairSalon", "localBusiness"),
  category("hotel", "Hotel", "localBusiness"),
  category("it-support", "LocalBusiness", "localBusiness"),
  category("landscaping", "HomeAndConstructionBusiness", "localBusiness"),
  category("law-firm", "LegalService", "localBusiness"),
  category("personal-trainer", "LocalBusiness", "localBusiness"),
  category("pet-grooming", "LocalBusiness", "localBusiness"),
  category("photographer", "LocalBusiness", "localBusiness"),
  category("plumber", "Plumber", "localBusiness"),
  category("real-estate-agent", "RealEstateAgent", "localBusiness"),
  category("restaurant", "Restaurant", "localBusiness"),
  category("tattoo-studio", "TattooParlor", "localBusiness"),
  category("veterinary-clinic", "VeterinaryCare", "localBusiness"),
  category("web-design", "LocalBusiness", "localBusiness"),
  category("wedding-planner", "LocalBusiness", "localBusiness"),
  category("wine-bar", "BarOrPub", "localBusiness"),
  category("yoga-studio", "SportsActivityLocation", "localBusiness"),
]);

const CATEGORIES_BY_ID = new Map(SITE_IDENTITY_CATEGORIES.map((entry) => [entry.id, entry]));

export const PROFILE_NETWORKS = Object.freeze([
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "youtube",
  "tiktok",
  "pinterest",
  "github",
  "mastodon",
  "bluesky",
  "discord",
  "reddit",
  "telegram",
  "threads",
  "whatsapp",
]);

export const WEEKDAYS = Object.freeze(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

const MAX_LOCATIONS = 20;
const MAX_RANGES_PER_DAY = 4;
const LIMITS = Object.freeze({
  name: 200,
  description: 500,
  email: 254,
  telephone: 40,
  priceRange: 30,
  url: 500,
  street: 200,
  locality: 100,
  region: 100,
  postalCode: 20,
});

const LOGO_PATH = /^\/uploads\/images\/(?!\.\.?$)[^/\\?#<>"'\s]+$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const TELEPHONE = /^\+?[0-9][0-9 ().-]*$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const COUNTRY = /^[A-Za-z]{2}$/;
const URL_MARKUP = /[<>"'\s]/;

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isTime(value) {
  return typeof value === "string" && TIME.test(value);
}

function isProfileUrl(value) {
  if (!/^https?:\/\//i.test(value) || URL_MARKUP.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function assign(target, key, value) {
  if (value !== undefined) target[key] = value;
}

/**
 * Validate and normalise a project's site identity. Returns the pruned value
 * (only valid, non-empty fields) and one `{ field, code }` per rejected field;
 * `code` is "invalid", "tooLong", "tooMany" or "unknown".
 * @param {*} input
 * @returns {{ value: object, errors: Array<{ field: string, code: string }> }}
 */
export function normalizeSiteIdentity(input) {
  const errors = [];
  const value = {};
  const fail = (field, code = "invalid") => errors.push({ field, code });

  const readText = (raw, field, max) => {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw !== "string") {
      fail(field);
      return undefined;
    }
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed.length > max) {
      fail(field, "tooLong");
      return undefined;
    }
    return trimmed;
  };

  const readMatching = (raw, field, max, test) => {
    const text = readText(raw, field, max);
    if (text === undefined) return undefined;
    if (!test(text)) {
      fail(field);
      return undefined;
    }
    return text;
  };

  const readTextGroup = (raw, field, maxByKey) => {
    if (raw === undefined || raw === null) return undefined;
    if (!isPlainObject(raw)) {
      fail(field);
      return undefined;
    }
    const group = {};
    for (const [key, max] of Object.entries(maxByKey)) assign(group, key, readText(raw[key], `${field}.${key}`, max));
    return Object.keys(group).length ? group : undefined;
  };

  const readOpeningHours = (raw, field) => {
    if (raw === undefined || raw === null) return undefined;
    if (!isPlainObject(raw)) {
      fail(field);
      return undefined;
    }
    const hours = {};
    for (const [day, ranges] of Object.entries(raw)) {
      const dayField = `${field}.${day}`;
      if (!WEEKDAYS.includes(day)) {
        fail(dayField, "unknown");
        continue;
      }
      if (!Array.isArray(ranges)) {
        fail(dayField);
        continue;
      }
      if (ranges.length > MAX_RANGES_PER_DAY) {
        fail(dayField, "tooMany");
        continue;
      }
      const kept = [];
      ranges.forEach((range, index) => {
        if (!isPlainObject(range) || !isTime(range.opens) || !isTime(range.closes) || range.opens === range.closes) {
          fail(`${dayField}.${index}`);
        } else {
          kept.push({ opens: range.opens, closes: range.closes });
        }
      });
      if (kept.length === ranges.length) hours[day] = kept;
    }
    return Object.keys(hours).length ? hours : undefined;
  };

  const readLocation = (raw, field) => {
    if (!isPlainObject(raw)) {
      fail(field);
      return undefined;
    }
    const location = {};
    assign(location, "streetAddress", readText(raw.streetAddress, `${field}.streetAddress`, LIMITS.street));
    assign(location, "addressLocality", readText(raw.addressLocality, `${field}.addressLocality`, LIMITS.locality));
    assign(location, "addressRegion", readText(raw.addressRegion, `${field}.addressRegion`, LIMITS.region));
    assign(location, "postalCode", readText(raw.postalCode, `${field}.postalCode`, LIMITS.postalCode));
    const country = readMatching(raw.addressCountry, `${field}.addressCountry`, 2, (text) => COUNTRY.test(text));
    assign(location, "addressCountry", country?.toUpperCase());
    assign(location, "openingHours", readOpeningHours(raw.openingHours, `${field}.openingHours`));
    assign(location, "text", readTextGroup(raw.text, `${field}.text`, { label: LIMITS.name }));
    return Object.keys(location).length ? location : undefined;
  };

  if (input === undefined || input === null) return { value, errors };
  if (!isPlainObject(input)) {
    fail("siteIdentity");
    return { value, errors };
  }

  const categoryId = readText(input.category, "category", LIMITS.name);
  if (categoryId !== undefined) {
    if (CATEGORIES_BY_ID.has(categoryId)) value.category = categoryId;
    else fail("category", "unknown");
  }

  assign(value, "logo", readMatching(input.logo, "logo", LIMITS.url, (text) => LOGO_PATH.test(text)));
  assign(value, "email", readMatching(input.email, "email", LIMITS.email, (text) => EMAIL.test(text)));
  assign(value, "telephone", readMatching(input.telephone, "telephone", LIMITS.telephone, (text) => TELEPHONE.test(text)));
  assign(value, "priceRange", readText(input.priceRange, "priceRange", LIMITS.priceRange));

  if (input.profiles !== undefined && input.profiles !== null) {
    if (!isPlainObject(input.profiles)) {
      fail("profiles");
    } else {
      const profiles = {};
      for (const [network, raw] of Object.entries(input.profiles)) {
        const field = `profiles.${network}`;
        if (!PROFILE_NETWORKS.includes(network)) {
          fail(field, "unknown");
          continue;
        }
        assign(profiles, network, readMatching(raw, field, LIMITS.url, isProfileUrl));
      }
      if (Object.keys(profiles).length) value.profiles = profiles;
    }
  }

  if (input.locations !== undefined && input.locations !== null) {
    if (!Array.isArray(input.locations)) {
      fail("locations");
    } else if (input.locations.length > MAX_LOCATIONS) {
      fail("locations", "tooMany");
    } else {
      const locations = input.locations
        .map((raw, index) => readLocation(raw, `locations.${index}`))
        .filter((location) => location !== undefined);
      if (locations.length) value.locations = locations;
    }
  }

  assign(value, "text", readTextGroup(input.text, "text", { publicName: LIMITS.name, description: LIMITS.description }));

  return { value, errors };
}

/**
 * The category row for an identity, or null when none (or an unknown one) is set.
 * @param {object} identity
 */
export function identityCategory(identity) {
  return CATEGORIES_BY_ID.get(identity?.category) || null;
}

/**
 * "organization", "person" or "localBusiness". No category means organization.
 * @param {object} identity
 */
export function identityKind(identity) {
  return identityCategory(identity)?.kind || "organization";
}

/**
 * The identity with its derived values filled in: kind and schema.org type from
 * the category, and the public name falling back to the project's Site Title.
 * @param {object} identity
 * @param {object} project
 */
export function resolveSiteIdentity(identity, project) {
  const entry = identityCategory(identity) || CATEGORIES_BY_ID.get("organization");
  return {
    ...(isPlainObject(identity) ? identity : {}),
    category: entry.id,
    kind: entry.kind,
    schemaType: entry.schemaType,
    name: identity?.text?.publicName || project?.siteTitle || "",
    description: identity?.text?.description || "",
  };
}

/**
 * What Google can read from the project today, one `{ item, ok }` per fact the
 * identity's kind needs. Shared by the Project details readiness line and the
 * export warnings.
 * @param {object} identity
 * @param {object} project
 * @returns {Array<{ item: "siteUrl"|"name"|"logo"|"address", ok: boolean }>}
 */
export function identityReadiness(identity, project) {
  const resolved = resolveSiteIdentity(identity, project);
  const siteUrl = typeof project?.siteUrl === "string" ? project.siteUrl.trim() : "";
  const items = [
    { item: "siteUrl", ok: !!siteUrl && isValidSiteUrl(siteUrl) },
    { item: "name", ok: !!resolved.name },
  ];
  if (resolved.kind !== "person") items.push({ item: "logo", ok: !!resolved.logo });
  if (resolved.kind === "localBusiness") {
    const primary = resolved.locations?.[0];
    items.push({ item: "address", ok: !!(primary?.streetAddress && primary?.addressLocality && primary?.addressCountry) });
  }
  return items;
}
