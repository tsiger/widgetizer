import path from "path";

function registerVideoFilter(engine) {
  engine.registerFilter("video", function (input, options) {
    // Handle blank input gracefully
    if (!input || typeof input !== "string") {
      return "";
    }

    // Extract the filename from the full path
    const filename = path.basename(input);

    // Get the full media object from the context
    const mediaFile = this.context.get(["mediaFiles", filename]);
    if (!mediaFile) {
      return `<!-- Video filter error: media file "${filename}" not found in media.json -->`;
    }

    // Check if it's actually a video file
    if (!mediaFile.type || !mediaFile.type.startsWith("video/")) {
      return `<!-- Video filter error: "${filename}" is not a video file -->`;
    }

    // Sensible defaults for options
    const opts = {
      controls: true,
      autoplay: false,
      muted: false,
      loop: false,
      preload: "metadata",
      class: "",
      width: mediaFile.width || null,
      height: mediaFile.height || null,
      poster: mediaFile.thumbnail || "",
      ...options,
    };

    // Get the base path from the context
    const videoBasePath = this.context.get(["imagePath"]); // Reuse image path since videos are stored in same location
    const src = `${videoBasePath}/${filename}`;

    // Build attributes array
    const attributes = [];

    if (opts.class) {
      attributes.push(`class="${opts.class}"`);
    }

    if (opts.width) {
      attributes.push(`width="${opts.width}"`);
    }

    if (opts.height) {
      attributes.push(`height="${opts.height}"`);
    }

    if (opts.controls) {
      attributes.push("controls");
    }

    if (opts.autoplay) {
      attributes.push("autoplay");
    }

    if (opts.muted) {
      attributes.push("muted");
    }

    if (opts.loop) {
      attributes.push("loop");
    }

    if (opts.preload) {
      attributes.push(`preload="${opts.preload}"`);
    }

    if (opts.poster && opts.poster !== src) {
      const posterBasePath = this.context.get(["imagePath"]);
      const posterSrc = opts.poster.startsWith("/")
        ? `${posterBasePath}${opts.poster}`
        : `${posterBasePath}/${opts.poster}`;
      attributes.push(`poster="${posterSrc}"`);
    }

    // Add alt text as title attribute for accessibility
    if (mediaFile.metadata?.alt) {
      attributes.push(`title="${mediaFile.metadata.alt.replace(/"/g, "&quot;")}"`);
    }

    const attributeString = attributes.join(" ");

    // Build the video element with fallback text
    return `<video src="${src}" ${attributeString}>
      Your browser does not support the video tag.
    </video>`;
  });
}

export { registerVideoFilter };
