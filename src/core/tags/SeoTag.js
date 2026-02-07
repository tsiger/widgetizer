// Purpose: Liquid tag to output SEO meta tags

export const SeoTag = {
  // eslint-disable-next-line no-unused-vars
  parse(tagToken) {
    this.tagName = tagToken.name;
  },

  *render(context) {
    try {
      const allVars = context.getAll();
      const page = allVars.page;
      const project = allVars.project;
      const imagePath = (allVars.imagePath || "uploads/images").replace(/^\/+/, "");

      if (!page) {
        return "<!-- SEO Tag: No page data found -->";
      }

      // Use page.seo if available, otherwise create defaults
      const seo = page.seo || {};
      const metaTags = [];

      // Check if we have an image for conditional logic
      const hasImage = seo.og_image && seo.og_image.trim();

      // HTML title - use page name
      const title = page.name || "Untitled Page";
      metaTags.push(`<title>${escapeHtml(title)}</title>`);

      // Meta description - use seo.description if available
      const description = seo.description && seo.description.trim() ? seo.description : "";
      if (description) {
        metaTags.push(`<meta name="description" content="${escapeHtml(description)}">`);
      }

      // Robots meta tag
      const robots = seo.robots || "index,follow";
      metaTags.push(`<meta name="robots" content="${escapeHtml(robots)}">`);

      // Canonical URL if specified
      if (seo.canonical_url && seo.canonical_url.trim()) {
        metaTags.push(`<link rel="canonical" href="${escapeHtml(seo.canonical_url)}">`);
      }

      // Open Graph tags
      const ogTitle = seo.og_title && seo.og_title.trim() ? seo.og_title : title;
      metaTags.push(`<meta property="og:title" content="${escapeHtml(ogTitle)}">`);

      const ogDescription = description; // Use the same description as meta description
      if (ogDescription) {
        metaTags.push(`<meta property="og:description" content="${escapeHtml(ogDescription)}">`);
      }

      const ogType = seo.og_type || "website";
      metaTags.push(`<meta property="og:type" content="${escapeHtml(ogType)}">`);

      // Open Graph image - only if specified
      if (hasImage) {
        const ogImageUrl = resolveImageUrl(seo.og_image, imagePath, project?.siteUrl);
        metaTags.push(`<meta property="og:image" content="${escapeHtml(ogImageUrl)}">`);
      }

      // Twitter Card tags - only add if we have an image or use summary card
      const twitterCard = hasImage ? seo.twitter_card || "summary_large_image" : "summary";

      metaTags.push(`<meta name="twitter:card" content="${escapeHtml(twitterCard)}">`);
      metaTags.push(`<meta name="twitter:title" content="${escapeHtml(ogTitle)}">`);

      if (ogDescription) {
        metaTags.push(`<meta name="twitter:description" content="${escapeHtml(ogDescription)}">`);
      }

      // Twitter image (use same as og:image) - only if image exists
      if (hasImage) {
        const twitterImageUrl = resolveImageUrl(seo.og_image, imagePath, project?.siteUrl);
        metaTags.push(`<meta name="twitter:image" content="${escapeHtml(twitterImageUrl)}">`);
      }

      return metaTags.join("\n\t\t");
    } catch (error) {
      console.error("SEO Tag error:", error);
      return "<!-- SEO Tag: Error generating meta tags -->";
    }
  },
};

/**
 * Resolves an og_image value to the correct URL using imagePath.
 * Stored og_image values are typically "/uploads/images/file.jpg" — the
 * filename is extracted and combined with the current imagePath so that
 * preview mode uses the API URL and publish mode uses "assets/images".
 * Fully-qualified URLs (http/https) are returned unchanged.
 */
function resolveImageUrl(rawValue, imagePath, siteUrl) {
  if (!rawValue) return "";

  // Already an absolute URL — use as-is
  if (rawValue.startsWith("http")) {
    return rawValue;
  }

  // Extract just the filename from the stored path
  // e.g. "/uploads/images/hero.jpg" → "hero.jpg"
  const filename = rawValue.split("/").pop();
  const resolvedPath = `/${imagePath}/${filename}`;

  if (siteUrl) {
    const cleanSiteUrl = siteUrl.replace(/\/$/, "");
    return `${cleanSiteUrl}${resolvedPath}`;
  }

  return resolvedPath;
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
