import path from "path";

function registerVideoFilter(engine) {
  engine.registerFilter("video", function (input, ...args) {
    if (!input || typeof input !== "string") {
      return "";
    }

    const filename = path.basename(input);
    const mediaFile = this.context.get(["mediaFiles", filename]);
    if (!mediaFile) {
      return `<!-- Video filter error: media file "${filename}" not found -->`;
    }
    if (!mediaFile.type?.startsWith("video/")) {
      return `<!-- Video filter error: "${filename}" is not a video file -->`;
    }

    const firstArg = args[0];

    // Check if user wants just the path/url (like image filter)
    if (firstArg === "path" || firstArg === "url") {
      const videoBasePath = this.context.get(["videoPath"]);
      return `${videoBasePath}/${filename}`;
    }

    // Original behavior: full video tag
    // arg[0]: controls (boolean)
    // arg[1]: autoplay (boolean)
    // arg[2]: muted (boolean)
    // arg[3]: loop (boolean)
    // arg[4]: class (string)
    const controls = args[0] !== false; // default true
    const autoplay = args[1] === true; // default false
    const muted = args[2] === true; // default false
    const loop = args[3] === true; // default false
    const cssClass = args[4] || "";

    const videoBasePath = this.context.get(["videoPath"]);
    const src = `${videoBasePath}/${filename}`;

    const attributes = [];
    if (controls) attributes.push("controls");
    if (autoplay) attributes.push("autoplay");
    if (muted) attributes.push("muted");
    if (loop) attributes.push("loop");
    if (cssClass) attributes.push(`class="${cssClass}"`);

    attributes.push(`preload="metadata"`);
    if (mediaFile.width) attributes.push(`width="${mediaFile.width}"`);
    if (mediaFile.height) attributes.push(`height="${mediaFile.height}"`);

    if (mediaFile.thumbnail) {
      const posterPath = this.context.get(["imagePath"]);
      // Ensure poster path is constructed correctly
      const posterFilename = path.basename(mediaFile.thumbnail);
      const posterSrc = `${posterPath}/${posterFilename}`;
      if (posterSrc !== src) attributes.push(`poster="${posterSrc}"`);
    }

    if (mediaFile.metadata?.alt) {
      attributes.push(`title="${mediaFile.metadata.alt.replace(/"/g, "&quot;")}"`);
    }

    const attributeString = attributes.join(" ");
    return `<video src="${src}" ${attributeString}>Your browser does not support the video tag.</video>`;
  });
}

export { registerVideoFilter };
