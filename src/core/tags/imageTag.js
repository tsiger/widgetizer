import path from "path";
import { Hash } from "liquidjs";

export const ImageTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const { src, size = "medium", class: cssClass = "", lazy = true, alt = "", title = "", output } = options;

    if (!src) return "";

    const filename = path.basename(src);
    const mediaFile = context.get(["mediaFiles", filename]);

    if (!mediaFile) {
      return `<!-- Image tag error: media file "${filename}" not found -->`;
    }

    const isSvg = mediaFile.type === "image/svg+xml" || filename.toLowerCase().endsWith(".svg");

    // Return URL only if requested
    if (output === "url" || output === "path") {
      if (isSvg) {
        const imageBasePath = context.get(["imagePath"]);
        return `${imageBasePath}/${path.basename(mediaFile.path)}`;
      }

      const imageSize = mediaFile.sizes?.[size] || {
        path: mediaFile.path,
        width: mediaFile.width,
        height: mediaFile.height,
      };

      const imageBasePath = context.get(["imagePath"]);
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
    const imageBasePath = context.get(["imagePath"]);
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

    // Advanced performance attributes
    if (options.fetchpriority) attrs.push(`fetchpriority="${options.fetchpriority}"`);
    if (options.decoding) attrs.push(`decoding="${options.decoding}"`);

    // Loading strategy: explicit 'loading' attr takes precedence over 'lazy' boolean
    if (options.loading) {
      attrs.push(`loading="${options.loading}"`);
    } else if (lazy) {
      attrs.push('loading="lazy"');
    }

    return `<img ${attrs.join(" ")}>`;
  },
};
