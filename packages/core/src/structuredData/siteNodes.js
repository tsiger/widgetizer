import { isHomeSlug } from "../utils/internalHref.js";
import { currentPageNumber, pageSelfUrl, publishedImageUrl } from "../utils/publishedUrls.js";
import { resolveSiteIdentity, WEEKDAYS } from "../utils/siteIdentity.js";
import { siteNodeId, urlNodeId } from "./ids.js";
import { breadcrumbItems } from "./breadcrumbNode.js";

// schema.org files these types outside LocalBusiness, so a local business of
// that type declares LocalBusiness as well.
const OUTSIDE_LOCAL_BUSINESS = new Set(["VeterinaryCare"]);

const SCHEMA_DAYS = Object.fromEntries(
  WEEKDAYS.map((day) => [day, `https://schema.org/${day.charAt(0).toUpperCase()}${day.slice(1)}`]),
);

function isHomepage(page) {
  return isHomeSlug(page?.slug) && currentPageNumber(page) === 1;
}

function textOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function homepageIdentity({ page, project }) {
  if (!isHomepage(page)) return null;
  const identity = resolveSiteIdentity(project?.siteIdentity, project);
  return identity.name ? identity : null;
}

function identityType(identity) {
  return identity.kind === "localBusiness" && OUTSIDE_LOCAL_BUSINESS.has(identity.schemaType)
    ? [identity.schemaType, "LocalBusiness"]
    : identity.schemaType;
}

function postalAddress(location) {
  const fields = ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"];
  if (!location || !fields.some((field) => location[field])) return undefined;
  return { "@type": "PostalAddress", ...Object.fromEntries(fields.map((field) => [field, location[field]])) };
}

function openingHoursSpecification(hours) {
  if (!hours) return undefined;
  const specs = [];
  for (const day of WEEKDAYS) {
    const ranges = hours[day];
    if (!Array.isArray(ranges)) continue;
    const dayOfWeek = SCHEMA_DAYS[day];
    // Google reads opens and closes both at 00:00 as closed all day.
    const dayRanges = ranges.length ? ranges : [{ opens: "00:00", closes: "00:00" }];
    for (const { opens, closes } of dayRanges) {
      specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes });
    }
  }
  return specs.length ? specs : undefined;
}

/** The homepage's WebSite node. */
export function websiteNode(context) {
  const { page, project, siteUrl } = context;
  if (!isHomepage(page)) return null;
  return {
    "@type": "WebSite",
    "@id": siteNodeId(siteUrl, "website"),
    url: siteUrl,
    name: resolveSiteIdentity(project?.siteIdentity, project).name,
    publisher: homepageIdentity(context) ? { "@id": siteNodeId(siteUrl, "identity") } : undefined,
  };
}

/** The homepage's organization, person or local business node — omitted without a name. */
export function identityNode(context) {
  const identity = homepageIdentity(context);
  if (!identity) return null;
  const { siteUrl, mediaFiles } = context;
  const image = identity.logo ? publishedImageUrl(identity.logo, siteUrl, mediaFiles) : undefined;

  const node = {
    "@type": identityType(identity),
    "@id": siteNodeId(siteUrl, "identity"),
    name: identity.name,
    description: identity.description,
    url: siteUrl,
    email: identity.email,
    telephone: identity.telephone,
    sameAs: Object.values(identity.profiles || {}),
  };

  if (identity.kind === "person") {
    node.image = image;
  } else {
    node.logo = image;
  }

  if (identity.kind === "localBusiness") {
    const primary = identity.locations?.[0];
    node.image = image;
    node.priceRange = identity.priceRange;
    node.address = postalAddress(primary);
    node.openingHoursSpecification = openingHoursSpecification(primary?.openingHours);
  }

  return node;
}

/** Every page's WebPage node, anchored on its own published address. */
export function webPageNode(context) {
  const { page, project, siteUrl } = context;
  const url = pageSelfUrl(page, project);
  const id = urlNodeId(url, "webpage");
  if (!id) return null;
  const seo = page.seo || {};
  return {
    "@type": "WebPage",
    "@id": id,
    url,
    name: textOr(seo.title, page.name),
    description: textOr(seo.description, undefined),
    isPartOf: { "@id": siteNodeId(siteUrl, "website") },
    about: homepageIdentity(context) ? { "@id": siteNodeId(siteUrl, "identity") } : undefined,
    breadcrumb: breadcrumbItems(context).length ? { "@id": urlNodeId(url, "breadcrumb") } : undefined,
  };
}
