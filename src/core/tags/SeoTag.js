// Purpose: Liquid tag to output SEO meta tags

export const SeoTag = {
  parse: function (tagToken, remainTokens) {
    //TODO: remainTokens is not used
    // No arguments expected
    this.tagName = tagToken.name;
  },
  render: function (context, hash) {
    //TODO: hash is not used
    try {
      const allVars = context.getAll();
      const page = allVars.page;
      const project = allVars.project;
      const imagePath = allVars.imagePath || "uploads/images";

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
        let ogImageUrl = seo.og_image;

        // If it's a relative path, make it absolute using project site URL
        if (!ogImageUrl.startsWith("http")) {
          const siteUrl = project?.siteUrl;
          if (siteUrl) {
            // Remove trailing slash from siteUrl and leading slash from path
            const cleanSiteUrl = siteUrl.replace(/\/$/, "");
            const cleanImagePath = ogImageUrl.startsWith("/") ? ogImageUrl : `/${imagePath}/${ogImageUrl}`;
            ogImageUrl = `${cleanSiteUrl}${cleanImagePath}`;
          } else {
            // Fallback to relative path if no site URL configured
            ogImageUrl = ogImageUrl.startsWith("/") ? ogImageUrl : `/${imagePath}/${ogImageUrl}`;
          }
        }

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
        let twitterImageUrl = seo.og_image;

        // If it's a relative path, make it absolute using project site URL
        if (!twitterImageUrl.startsWith("http")) {
          const siteUrl = project?.siteUrl;
          if (siteUrl) {
            // Remove trailing slash from siteUrl and leading slash from path
            const cleanSiteUrl = siteUrl.replace(/\/$/, "");
            const cleanImagePath = twitterImageUrl.startsWith("/")
              ? twitterImageUrl
              : `/${imagePath}/${twitterImageUrl}`;
            twitterImageUrl = `${cleanSiteUrl}${cleanImagePath}`;
          } else {
            // Fallback to relative path if no site URL configured
            twitterImageUrl = twitterImageUrl.startsWith("/") ? twitterImageUrl : `/${imagePath}/${twitterImageUrl}`;
          }
        }

        metaTags.push(`<meta name="twitter:image" content="${escapeHtml(twitterImageUrl)}">`);
      }

      return metaTags.join("\n\t\t");
    } catch (error) {
      console.error("SEO Tag error:", error);
      return "<!-- SEO Tag: Error generating meta tags -->";
    }
  },
};

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
