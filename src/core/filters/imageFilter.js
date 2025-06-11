import path from "path";

function registerImageFilter(engine) {
  engine.registerFilter("image", function (input, options) {
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

    // Sensible defaults for options
    const opts = {
      size: "medium",
      lazy: true,
      class: "",
      alt: mediaFile.metadata?.alt || "",
      title: mediaFile.metadata?.title || "",
      ...options,
    };

    // Find the requested size, or fallback gracefully
    const imageSize = mediaFile.sizes?.[opts.size] || {
      path: mediaFile.path,
      width: mediaFile.width,
      height: mediaFile.height,
    };

    if (!imageSize || !imageSize.path) {
      return `<!-- Image filter error: size "${opts.size}" not found for "${filename}" -->`;
    }

    // Construct attributes
    const classAttr = opts.class ? `class="${opts.class}"` : "";
    const altAttr = `alt="${opts.alt.replace(/"/g, "&quot;")}"`; // Escape quotes
    const titleAttr = opts.title ? `title="${opts.title.replace(/"/g, "&quot;")}"` : "";
    const widthAttr = imageSize.width ? `width="${imageSize.width}"` : "";
    const heightAttr = imageSize.height ? `height="${imageSize.height}"` : "";
    const lazyAttr = opts.lazy ? 'loading="lazy"' : "";

    // Get the base path from the context
    const imageBasePath = this.context.get(["imagePath"]);
    const src = `${imageBasePath}/${path.basename(imageSize.path)}`;

    return `<img src="${src}" ${classAttr} ${altAttr} ${titleAttr} ${widthAttr} ${heightAttr} ${lazyAttr}>`;
  });
}

export { registerImageFilter };
