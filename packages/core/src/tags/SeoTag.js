// Purpose: Liquid tag to output SEO meta tags

export const SeoTag = {
  parse(tagToken) {
    this.tagName = tagToken.name;
  },

  render(context) {
    try {
      const allVars = context.getAll();
      const page = allVars.page;
      const project = allVars.project;
      const mediaFiles = allVars.mediaFiles || {};

      if (!page) {
        return "<!-- SEO Tag: No page data found -->";
      }

      // Use page.seo if available, otherwise create defaults
      const seo = page.seo || {};
      const metaTags = [];

      const pageTitle = seo.title && seo.title.trim() ? seo.title.trim() : page.name || "";
      const siteTitle = project?.siteTitle && project.siteTitle.trim() ? project.siteTitle.trim() : "";
      const htmlTitle = siteTitle ? `${pageTitle} - ${siteTitle}` : pageTitle;
      metaTags.push(`<title>${escapeHtml(htmlTitle)}</title>`);

      // Meta description - use seo.description if available
      const description = seo.description && seo.description.trim() ? seo.description : "";
      if (description) {
        metaTags.push(`<meta name="description" content="${escapeHtml(description)}">`);
      }

      // Robots meta tag
      const robots = seo.robots || "index,follow";
      metaTags.push(`<meta name="robots" content="${escapeHtml(robots)}">`);

      // Canonical URL: explicit page-level value wins; otherwise auto-generate
      // from siteUrl + slug (homepage canonicalizes to the bare root).
      const canonicalUrl = resolveCanonicalUrl(seo.canonical_url, project?.siteUrl, page.slug);
      if (canonicalUrl) {
        metaTags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`);
      }

      // Open Graph tags
      const ogTitle = seo.og_title && seo.og_title.trim() ? seo.og_title : pageTitle;
      metaTags.push(`<meta property="og:title" content="${escapeHtml(ogTitle)}">`);

      const ogDescription = description; // Use the same description as meta description
      if (ogDescription) {
        metaTags.push(`<meta property="og:description" content="${escapeHtml(ogDescription)}">`);
      }

      const ogType = seo.og_type || "website";
      metaTags.push(`<meta property="og:type" content="${escapeHtml(ogType)}">`);

      // Open Graph image. Social crawlers require an absolute URL, so this is
      // emitted only when it resolves to one (an absolute og_image, or a
      // siteUrl-based published URL). Without siteUrl it is omitted entirely
      // rather than emitting a useless relative path.
      const ogImageUrl =
        seo.og_image && seo.og_image.trim() ? resolveImageUrl(seo.og_image, project?.siteUrl, mediaFiles) : "";
      if (ogImageUrl) {
        metaTags.push(`<meta property="og:image" content="${escapeHtml(ogImageUrl)}">`);
      }

      // Twitter Card tags - large image card only when we have a resolved image
      const twitterCard = ogImageUrl ? seo.twitter_card || "summary_large_image" : "summary";

      metaTags.push(`<meta name="twitter:card" content="${escapeHtml(twitterCard)}">`);
      metaTags.push(`<meta name="twitter:title" content="${escapeHtml(ogTitle)}">`);

      if (ogDescription) {
        metaTags.push(`<meta name="twitter:description" content="${escapeHtml(ogDescription)}">`);
      }

      // Twitter image (use same as og:image) - only when resolved
      if (ogImageUrl) {
        metaTags.push(`<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">`);
      }

      return metaTags.join("\n\t\t");
    } catch (error) {
      console.error("SEO Tag error:", error);
      return "<!-- SEO Tag: Error generating meta tags -->";
    }
  },
};

/**
 * Resolve an og_image value to an ABSOLUTE URL suitable for social crawlers.
 * Fully-qualified URLs (http/https) pass through unchanged. Otherwise the
 * filename is resolved to its published variant and combined with the project's
 * siteUrl and the published `assets/images/` location. Returns "" when no
 * absolute URL can be built (no siteUrl), so the caller omits the tag — a
 * relative og:image is meaningless to crawlers, and og:image must be
 * depth-independent (always absolute), so no outputPathPrefix is involved.
 */
function resolveImageUrl(rawValue, siteUrl, mediaFiles = {}) {
  if (!rawValue) return "";

  // Already an absolute URL — use as-is.
  if (rawValue.startsWith("http")) {
    return rawValue;
  }

  // Need an absolute base to build a usable social URL.
  if (!siteUrl || !siteUrl.trim()) return "";

  // Extract the filename from the stored path: "/uploads/images/hero.jpg" → "hero.jpg".
  const filename = rawValue.split("/").pop();
  const publicFilename = getPublicImageFilename(filename, mediaFiles);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  return `${cleanSiteUrl}/assets/images/${publicFilename}`;
}

function getPublicImageFilename(filename, mediaFiles) {
  const mediaFile = mediaFiles?.[filename];
  const isSvg = mediaFile?.type === "image/svg+xml" || filename?.toLowerCase().endsWith(".svg");
  const largePath = mediaFile?.sizes?.large?.path;

  if (!isSvg && largePath) {
    return largePath.split("/").pop();
  }

  return filename;
}

function resolveCanonicalUrl(explicitUrl, siteUrl, slug) {
  if (explicitUrl && explicitUrl.trim()) return explicitUrl.trim();
  if (!siteUrl || !siteUrl.trim()) return "";

  let base;
  try {
    base = new URL(siteUrl).href.replace(/\/$/, "");
  } catch {
    return "";
  }

  const isHomepage = slug === "index" || slug === "home";
  return isHomepage ? `${base}/` : `${base}/${slug}.html`;
}

// Helper function to escape HTML entities
function escapeHtml(text) {
  if (typeof text !== "string") return "";

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}
