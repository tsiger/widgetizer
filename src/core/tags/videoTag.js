import path from "path";
import { Hash } from "liquidjs";

export const VideoTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const {
      src,
      controls = true,
      autoplay = false,
      muted = false,
      loop = false,
      class: cssClass = "",
      output,
    } = options;

    if (!src) return "";

    const filename = path.basename(src);
    const mediaFile = context.get(["mediaFiles", filename]);

    if (!mediaFile) {
      return `<!-- Video tag error: media file "${filename}" not found -->`;
    }

    if (!mediaFile.type?.startsWith("video/")) {
      return `<!-- Video tag error: "${filename}" is not a video file -->`;
    }

    const videoBasePath = context.get(["videoPath"]);
    const videoSrc = `${videoBasePath}/${filename}`;

    // Return URL only if requested
    if (output === "url" || output === "path") {
      return videoSrc;
    }

    // Build full video tag
    const attrs = [];
    attrs.push(`src="${videoSrc}"`);

    if (controls) attrs.push("controls");
    if (autoplay) attrs.push("autoplay");
    if (muted) attrs.push("muted");
    if (loop) attrs.push("loop");
    if (cssClass) attrs.push(`class="${cssClass}"`);

    attrs.push('preload="metadata"');

    if (mediaFile.width) attrs.push(`width="${mediaFile.width}"`);
    if (mediaFile.height) attrs.push(`height="${mediaFile.height}"`);

    if (mediaFile.thumbnail) {
      const posterPath = context.get(["imagePath"]);
      const posterFilename = path.basename(mediaFile.thumbnail);
      const posterSrc = `${posterPath}/${posterFilename}`;
      if (posterSrc !== videoSrc) attrs.push(`poster="${posterSrc}"`);
    }

    if (mediaFile.metadata?.alt) {
      attrs.push(`title="${mediaFile.metadata.alt.replace(/"/g, "&quot;")}"`);
    }

    return `<video ${attrs.join(" ")}>Your browser does not support the video tag.</video>`;
  },
};
