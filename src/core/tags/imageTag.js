import path from "path";
import { Hash } from "liquidjs";

export const ImageTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const {
      src,
      size = "medium",
      class: cssClass = "",
      lazy = true,
      alt = "",
      title = "",
      output,
      srcset: wantSrcset = false,
      sizes: sizesAttr,
    } = options;

    if (!src) return "";

    const filename = path.basename(src);
    const mediaFile = context.get(["mediaFiles", filename]);

    const imageBasePath = context.get(["imagePath"]);

    // Fallback: no media metadata — render a simple img tag
    if (!mediaFile) {
      if (output === "url" || output === "path") return `${imageBasePath}/${filename}`;
      const attrs = [`src="${imageBasePath}/${filename}"`];
      if (alt) attrs.push(`alt="${alt.replace(/"/g, "&quot;")}"`);
      if (cssClass) attrs.push(`class="${cssClass}"`);
      if (options.loading) attrs.push(`loading="${options.loading}"`);
      else if (lazy) attrs.push('loading="lazy"');
      if (options.fetchpriority) attrs.push(`fetchpriority="${options.fetchpriority}"`);
      return `<img ${attrs.join(" ")}>`;
    }

    const isSvg = mediaFile.type === "image/svg+xml" || filename.toLowerCase().endsWith(".svg");

    // Return URL only if requested
    if (output === "url" || output === "path") {
      if (isSvg) {
        return `${imageBasePath}/${path.basename(mediaFile.path)}`;
      }

      const imageSize = mediaFile.sizes?.[size] || {
        path: mediaFile.path,
        width: mediaFile.width,
        height: mediaFile.height,
      };

      return `${imageBasePath}/${path.basename(imageSize.path)}`;
    }

    // Build full img tag
    let imageSize;
    if (isSvg) {
      imageSize = { path: mediaFile.path, width: null, height: null };
    } else {
      imageSize = mediaFile.sizes?.[size] || {
        path: mediaFile.path,
        width: mediaFile.width,
        height: mediaFile.height,
      };
    }

    const attrs = [];
    attrs.push(`src="${imageBasePath}/${path.basename(imageSize.path)}"`);

    const finalAlt = alt || mediaFile.metadata?.alt || "";
    attrs.push(`alt="${finalAlt.replace(/"/g, "&quot;")}"`);

    if (title || mediaFile.metadata?.title) {
      const finalTitle = title || mediaFile.metadata?.title;
      attrs.push(`title="${finalTitle.replace(/"/g, "&quot;")}"`);
    }

    if (cssClass) attrs.push(`class="${cssClass}"`);
    if (!isSvg && imageSize.width) attrs.push(`width="${imageSize.width}"`);
    if (!isSvg && imageSize.height) attrs.push(`height="${imageSize.height}"`);

    // Build srcset candidates (only for non-SVG with srcset: true)
    let srcsetValue = "";
    if (wantSrcset && !isSvg) {
      const candidates = [];
      const seenWidths = new Set();

      if (mediaFile.sizes) {
        for (const [sizeName, sizeData] of Object.entries(mediaFile.sizes)) {
          if (sizeName === "thumb") continue;
          if (!sizeData.path || typeof sizeData.width !== "number") continue;
          if (seenWidths.has(sizeData.width)) continue;
          seenWidths.add(sizeData.width);
          candidates.push({ path: sizeData.path, width: sizeData.width });
        }
      }

      // Include original if wider than all candidates
      const maxCandidateWidth = candidates.reduce((max, c) => Math.max(max, c.width), 0);
      if (
        typeof mediaFile.width === "number" &&
        mediaFile.width > maxCandidateWidth &&
        !seenWidths.has(mediaFile.width)
      ) {
        candidates.push({ path: mediaFile.path, width: mediaFile.width });
      }

      candidates.sort((a, b) => a.width - b.width);

      if (candidates.length >= 2) {
        srcsetValue = candidates
          .map((c) => `${imageBasePath}/${path.basename(c.path)} ${c.width}w`)
          .join(", ");
      }
    }

    // Advanced performance attributes
    if (options.fetchpriority) attrs.push(`fetchpriority="${options.fetchpriority}"`);
    if (options.decoding) attrs.push(`decoding="${options.decoding}"`);

    // Loading strategy: explicit 'loading' attr takes precedence over 'lazy' boolean
    if (options.loading) {
      attrs.push(`loading="${options.loading}"`);
    } else if (lazy) {
      attrs.push('loading="lazy"');
    }

    // Responsive image attributes
    if (srcsetValue) {
      attrs.push(`srcset="${srcsetValue}"`);
      if (sizesAttr) {
        attrs.push(`sizes="${sizesAttr}"`);
      }
    }

    return `<img ${attrs.join(" ")}>`;
  },
};
