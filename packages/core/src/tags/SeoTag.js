// Purpose: Liquid tag to output SEO meta tags

import { pageUrlAt, publishedImageUrl } from "../utils/publishedUrls.js";
import { structuredDataScript } from "../structuredData/index.js";

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
      const pagination = page.pagination?.total > 1 ? page.pagination : null;
      const pageNumber = pagination ? pagination.current : 1;
      const numberedTitle = pageNumber > 1 ? `${pageTitle} - ${pageNumber}` : pageTitle;
      const htmlTitle = siteTitle ? `${numberedTitle} - ${siteTitle}` : numberedTitle;
      metaTags.push(`<title>${escapeHtml(htmlTitle)}</title>`);

      // Meta description - use seo.description if available
      const description = seo.description && seo.description.trim() ? seo.description : "";
      if (description) {
        metaTags.push(`<meta name="description" content="${escapeHtml(description)}">`);
      }

      // Robots meta tag
      const robots = seo.robots || "index,follow";
      metaTags.push(`<meta name="robots" content="${escapeHtml(robots)}">`);

      // Canonical URL: explicit page-level value wins on page 1; otherwise the
      // page's own published address (homepage canonicalizes to the bare root).
      const pagedUrl = (number) => pageUrlAt(page.slug, number, project, { language: page.language });
      const explicitCanonical = seo.canonical_url && seo.canonical_url.trim() ? seo.canonical_url.trim() : "";
      const canonicalUrl = pageNumber > 1 ? pagedUrl(pageNumber) : explicitCanonical || pagedUrl(1);
      if (canonicalUrl) {
        metaTags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`);
      }
      // hreflang (§7d). A set without a self-reference is invalid and ignored,
      // so the page lists itself. `x-default` is the one place a fallback entry
      // is legitimate — an ordinary alternate pointing at a homepage would
      // claim it is the translation of this page, which it is not. A
      // single-language project emits none of this, because `translations` is
      // empty for one language.
      //
      // A noindex page is outside the cluster on both sides: it publishes no
      // alternates of its own (it cannot be a member without a self-reference
      // a crawler will honour), and no sibling advertises it. Search engines
      // drop such annotations anyway, so emitting them only puts a page's
      // robots directive at odds with its own markup.
      const translations = Array.isArray(page.translations) ? page.translations : [];
      if (translations.length > 1 && !robots.includes("noindex")) {
        for (const entry of translations) {
          if (entry.fallback || entry.noindex || !entry.seoUrl) continue;
          metaTags.push(
            `<link rel="alternate" hreflang="${escapeHtml(entry.hreflang)}" href="${escapeHtml(entry.seoUrl)}">`,
          );
        }
        const defaultEntry = translations.find((entry) => entry.language === project?.defaultLanguage);
        if (defaultEntry?.seoUrl && !defaultEntry.noindex) {
          metaTags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(defaultEntry.seoUrl)}">`);
        }
      }

      if (pagination) {
        const prevUrl = pageNumber > 1 ? pagedUrl(pageNumber - 1) : "";
        const nextUrl = pageNumber < pagination.total ? pagedUrl(pageNumber + 1) : "";
        if (prevUrl) metaTags.push(`<link rel="prev" href="${escapeHtml(prevUrl)}">`);
        if (nextUrl) metaTags.push(`<link rel="next" href="${escapeHtml(nextUrl)}">`);
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
        seo.og_image && seo.og_image.trim() ? publishedImageUrl(seo.og_image, project?.siteUrl, mediaFiles) : "";
      if (ogImageUrl) {
        metaTags.push(`<meta property="og:image" content="${escapeHtml(ogImageUrl)}">`);
      }

      // Twitter Card tags: derived purely from image presence. The stored
      // seo.twitter_card is deliberately ignored: no UI exposes it, and the
      // editor persists a phantom "summary" on every save that would otherwise
      // permanently block the large-image card.
      const twitterCard = ogImageUrl ? "summary_large_image" : "summary";

      metaTags.push(`<meta name="twitter:card" content="${escapeHtml(twitterCard)}">`);
      metaTags.push(`<meta name="twitter:title" content="${escapeHtml(ogTitle)}">`);

      if (ogDescription) {
        metaTags.push(`<meta name="twitter:description" content="${escapeHtml(ogDescription)}">`);
      }

      // Twitter image (use same as og:image) - only when resolved
      if (ogImageUrl) {
        metaTags.push(`<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">`);
      }

      // Its own guard: a structured-data failure must not cost the page its title and meta tags.
      try {
        const script = structuredDataScript({ page, project, mediaFiles });
        if (script) metaTags.push(script);
      } catch (error) {
        console.error("SEO Tag structured data error:", error);
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
