import { absoluteSiteUrl } from "../utils/internalHref.js";
import { publicPath } from "../utils/contentAddress.js";
import { pageSelfUrl } from "../utils/publishedUrls.js";
import { urlNodeId } from "./ids.js";

/**
 * The absolute entries of the page's visible breadcrumb trail (`page.breadcrumbs`),
 * so both follow the same hierarchy. An entry with no address or no label is
 * skipped; fewer than two entries (the homepage) gives none. Gotcha: a numbered
 * copy's last crumb reads "Page N", the breadcrumbs snippet's default — a theme
 * passing its own `page_label` or `home_label` draws different words than this.
 * @param {{ page?: object, project?: object }} context
 * @returns {Array<{ name: string, url: string }>}
 */
export function breadcrumbItems({ page, project } = {}) {
  const trail = Array.isArray(page?.breadcrumbs) ? page.breadcrumbs : [];
  const items = [];
  for (const crumb of trail) {
    if (!crumb || typeof crumb.canonicalPath !== "string" || !crumb.canonicalPath) continue;
    const url = crumb.home
      ? absoluteSiteUrl(project?.siteUrl, "")
      : absoluteSiteUrl(project?.siteUrl, publicPath(crumb.canonicalPath, { cleanUrls: project?.cleanUrls }));
    const label = typeof crumb.label === "string" ? crumb.label.trim() : "";
    const name = crumb.pageNumber ? `Page ${crumb.pageNumber}` : label;
    if (url && name) items.push({ name, url });
  }
  return items.length >= 2 ? items : [];
}

/** The page's BreadcrumbList node, built from its visible trail. */
export function breadcrumbNode(context) {
  const items = breadcrumbItems(context);
  const id = urlNodeId(pageSelfUrl(context.page, context.project), "breadcrumb");
  if (!items.length || !id) return null;
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.url,
    })),
  };
}
