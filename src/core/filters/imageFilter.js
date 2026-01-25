import path from "path";

function registerImageFilter(engine) {
  engine.registerFilter("image", function (input, ...args) {
    // Handle blank input gracefully
    if (!input || typeof input !== "string") {
      return "";
    }

    // Extract the filename from the full path
    const filename = path.basename(input);

    // Get the full media object from the context
    const mediaFile = this.context.get(["mediaFiles", filename]);
    if (!mediaFile) {
      return `<!-- Image filter error: media file "${filename}" not found in media.json -->`;
    }

    // Check if this is an SVG file - SVGs don't have sizes and should always use original path
    const isSvg = mediaFile.type === "image/svg+xml" || filename.toLowerCase().endsWith(".svg");

    // Parse arguments - LiquidJS passes them as individual parameters
    // Usage: {{ image | image: 'small' }} or {{ image | image: 'large', 'hero-class', false }}
    // For path only: {{ image | image: 'path' }} or {{ image | image: 'url' }}
    // For path with specific size: {{ image | image: 'path', 'large' }}
    const firstArg = args[0] || "medium";

    // Check if user wants just the path/url
    const returnPathOnly = firstArg === "path" || firstArg === "url";

    if (returnPathOnly) {
      // For SVG files, always use original path (no sizes available)
      if (isSvg) {
        const imageBasePath = this.context.get(["imagePath"]);
        return `${imageBasePath}/${path.basename(mediaFile.path)}`;
      }

      // For path-only mode, second argument can specify size
      const size = args[1] || "medium";

      // Find the requested size, or fallback gracefully
      const imageSize = mediaFile.sizes?.[size] || {
        path: mediaFile.path,
        width: mediaFile.width,
        height: mediaFile.height,
      };

      if (!imageSize || !imageSize.path) {
        return `<!-- Image filter error: size "${size}" not found for "${filename}" -->`;
      }

      // Get the base path from the context and return just the URL
      const imageBasePath = this.context.get(["imagePath"]);
      return `${imageBasePath}/${path.basename(imageSize.path)}`;
    }

    // Original behavior for full img tag
    const size = firstArg;
    const cssClass = args[1] || "";
    const lazy = args[2] !== false; // Default to true unless explicitly false
    const altOverride = args[3] || "";
    const titleOverride = args[4] || "";

    // Build final options
    const opts = {
      size: size,
      lazy: lazy,
      class: cssClass,
      alt: altOverride || mediaFile.metadata?.alt || "",
      title: titleOverride || mediaFile.metadata?.title || "",
    };

    // For SVG files, always use original path (no sizes available)
    let imageSize;
    if (isSvg) {
      imageSize = {
        path: mediaFile.path,
        width: null, // SVGs don't have fixed dimensions
        height: null,
      };
    } else {
      // Find the requested size, or fallback gracefully
      imageSize = mediaFile.sizes?.[opts.size] || {
        path: mediaFile.path,
        width: mediaFile.width,
        height: mediaFile.height,
      };
    }

    if (!imageSize || !imageSize.path) {
      return `<!-- Image filter error: size "${opts.size}" not found for "${filename}" -->`;
    }

    // Construct attributes
    const classAttr = opts.class ? `class="${opts.class}"` : "";
    const altAttr = `alt="${opts.alt.replace(/"/g, "&quot;")}"`; // Escape quotes
    const titleAttr = opts.title ? `title="${opts.title.replace(/"/g, "&quot;")}"` : "";
    // Don't include width/height for SVG files (they're scalable)
    const widthAttr = !isSvg && imageSize.width ? `width="${imageSize.width}"` : "";
    const heightAttr = !isSvg && imageSize.height ? `height="${imageSize.height}"` : "";
    const lazyAttr = opts.lazy ? 'loading="lazy"' : "";

    // Get the base path from the context
    const imageBasePath = this.context.get(["imagePath"]);
    const src = `${imageBasePath}/${path.basename(imageSize.path)}`;

    return `<img src="${src}" ${classAttr} ${altAttr} ${titleAttr} ${widthAttr} ${heightAttr} ${lazyAttr}>`;
  });
}

export { registerImageFilter };
