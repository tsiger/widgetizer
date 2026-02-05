import { Hash } from "liquidjs";
import { generateIframeHtml, createYouTubeEmbed } from "../../utils/youtubeHelpers.js";

export const YouTubeTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const {
      src,
      width = "560",
      height = "315",
      class: className = "youtube-embed",
      loading = "lazy",
      title,
      autoplay = false,
      controls = true,
      mute = false,
      loop = false,
      modestbranding = false,
      rel = true,
      start,
      end,
      output,
    } = options;

    if (!src) return "";

    let embedData;
    if (typeof src === "string") {
      embedData = createYouTubeEmbed(src);
      if (!embedData) {
        return `<!-- YouTube tag error: invalid URL or video ID "${src}" -->`;
      }
    } else if (typeof src === "object" && src.videoId) {
      embedData = src;
    } else {
      return `<!-- YouTube tag error: invalid input type -->`;
    }

    // Apply custom options
    const customOptions = { autoplay, controls, mute, loop, modestbranding, rel };
    if (start) customOptions.start = start;
    if (end) customOptions.end = end;

    const mergedOptions = { ...embedData.options, ...customOptions };
    embedData = createYouTubeEmbed(embedData.url, mergedOptions);

    // Return URL only if requested
    if (output === "url") {
      return embedData.embedUrl;
    }

    if (output === "thumbnail") {
      const quality = options.quality || "hqdefault";
      return `https://img.youtube.com/vi/${embedData.videoId}/${quality}.jpg`;
    }

    // Build iframe
    const iframeOptions = { width, height, className, loading };
    if (title) iframeOptions.title = title;

    return generateIframeHtml(embedData, iframeOptions);
  },
};
