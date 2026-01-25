import { generateIframeHtml, createYouTubeEmbed } from "../../utils/youtubeHelpers.js";

function registerYouTubeFilter(engine) {
  engine.registerFilter("youtube", function (input, ...args) {
    // Handle blank input gracefully
    if (!input || (typeof input === "object" && !input.videoId)) {
      return "";
    }

    let embedData;

    // If input is a string (URL or video ID), create embed data
    if (typeof input === "string") {
      embedData = createYouTubeEmbed(input);
      if (!embedData) {
        return `<!-- YouTube filter error: invalid URL or video ID "${input}" -->`;
      }
    }
    // If input is already an embed data object
    else if (typeof input === "object" && input.videoId) {
      embedData = input;
    } else {
      return `<!-- YouTube filter error: invalid input type -->`;
    }

    // Parse arguments for custom options
    // Usage: {{ video | youtube }} or {{ video | youtube: width=640, height=360, autoplay=true }}
    const customOptions = {};
    const iframeOptions = {};

    args.forEach((arg) => {
      if (typeof arg === "string" && arg.includes("=")) {
        const [key, value] = arg.split("=").map((s) => s.trim());

        // Iframe-specific options
        if (["width", "height", "class", "title", "loading"].includes(key)) {
          iframeOptions[key === "class" ? "className" : key] = value;
        }
        // YouTube embed options
        else if (
          ["autoplay", "controls", "mute", "loop", "modestbranding", "rel", "showinfo", "fs", "start", "end"].includes(
            key,
          )
        ) {
          // Convert string boolean values
          if (value === "true") customOptions[key] = true;
          else if (value === "false") customOptions[key] = false;
          else if (!isNaN(value)) customOptions[key] = parseInt(value);
          else customOptions[key] = value;
        }
      }
    });

    // If custom options provided, recreate embed data
    if (Object.keys(customOptions).length > 0) {
      const mergedOptions = { ...embedData.options, ...customOptions };
      embedData = createYouTubeEmbed(embedData.url, mergedOptions);
    }

    // Default iframe options
    const defaultIframeOptions = {
      width: "560",
      height: "315",
      className: "youtube-embed",
      loading: "lazy",
      ...iframeOptions,
    };

    return generateIframeHtml(embedData, defaultIframeOptions);
  });

  // Additional filter for getting just the thumbnail
  engine.registerFilter("youtube_thumbnail", function (input, quality = "hqdefault") {
    if (!input) return "";

    let videoId;
    if (typeof input === "string") {
      const embedData = createYouTubeEmbed(input);
      videoId = embedData?.videoId;
    } else if (typeof input === "object" && input.videoId) {
      videoId = input.videoId;
    }

    if (!videoId) {
      return `<!-- YouTube thumbnail filter error: invalid input -->`;
    }

    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  });

  // Filter for getting just the embed URL
  engine.registerFilter("youtube_embed_url", function (input, ...args) {
    if (!input) return "";

    let embedData;
    if (typeof input === "string") {
      embedData = createYouTubeEmbed(input);
    } else if (typeof input === "object" && input.videoId) {
      embedData = input;
    }

    if (!embedData) {
      return `<!-- YouTube embed URL filter error: invalid input -->`;
    }

    // Parse custom options like the main filter
    const customOptions = {};
    args.forEach((arg) => {
      if (typeof arg === "string" && arg.includes("=")) {
        const [key, value] = arg.split("=").map((s) => s.trim());
        if (
          ["autoplay", "controls", "mute", "loop", "modestbranding", "rel", "showinfo", "fs", "start", "end"].includes(
            key,
          )
        ) {
          if (value === "true") customOptions[key] = true;
          else if (value === "false") customOptions[key] = false;
          else if (!isNaN(value)) customOptions[key] = parseInt(value);
          else customOptions[key] = value;
        }
      }
    });

    // If custom options provided, recreate embed data
    if (Object.keys(customOptions).length > 0) {
      const mergedOptions = { ...embedData.options, ...customOptions };
      embedData = createYouTubeEmbed(embedData.url, mergedOptions);
    }

    return embedData.embedUrl;
  });
}

export { registerYouTubeFilter };
