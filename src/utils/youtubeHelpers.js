/**
 * YouTube URL parsing and embed utilities
 */

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} url - YouTube URL or video ID
 * @returns {string|null} - Video ID or null if invalid
 */
export function extractVideoId(url) {
  if (!url || typeof url !== "string") return null;

  // Clean the URL
  url = url.trim();

  // If it's just a video ID (11 characters, alphanumeric and dashes/underscores)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  // YouTube URL patterns
  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Mobile URL: https://m.youtube.com/watch?v=VIDEO_ID
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // YouTube gaming: https://gaming.youtube.com/watch?v=VIDEO_ID
    /(?:gaming\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate if a URL/ID is a valid YouTube video
 * @param {string} url - YouTube URL or video ID
 * @returns {boolean} - True if valid
 */
export function validateYouTubeUrl(url) {
  return extractVideoId(url) !== null;
}

/**
 * Get YouTube video thumbnail URL
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - Thumbnail quality: 'default', 'hqdefault', 'mqdefault', 'sddefault', 'maxresdefault'
 * @returns {string} - Thumbnail URL
 */
export function getThumbnailUrl(videoId, quality = "hqdefault") {
  if (!videoId) return "";

  const validQualities = ["default", "hqdefault", "mqdefault", "sddefault", "maxresdefault"];
  const selectedQuality = validQualities.includes(quality) ? quality : "hqdefault";

  return `https://img.youtube.com/vi/${videoId}/${selectedQuality}.jpg`;
}

/**
 * Build YouTube embed URL with options
 * @param {string} videoId - YouTube video ID
 * @param {object} options - Embed options
 * @returns {string} - Complete embed URL
 */
export function buildEmbedUrl(videoId, options = {}) {
  if (!videoId) return "";

  const defaultOptions = {
    autoplay: 0,
    controls: 1,
    mute: 0,
    loop: 0,
    modestbranding: 1,
    rel: 0,
    showinfo: 0,
    fs: 1,
    cc_load_policy: 0,
    iv_load_policy: 3,
    start: null,
    end: null,
  };

  const embedOptions = { ...defaultOptions, ...options };

  // Convert boolean values to 0/1
  Object.keys(embedOptions).forEach((key) => {
    if (typeof embedOptions[key] === "boolean") {
      embedOptions[key] = embedOptions[key] ? 1 : 0;
    }
    // Remove null/undefined values
    if (embedOptions[key] === null || embedOptions[key] === undefined) {
      delete embedOptions[key];
    }
  });

  const params = new URLSearchParams(embedOptions).toString();
  return `https://www.youtube.com/embed/${videoId}?${params}`;
}

/**
 * Create complete YouTube embed data object
 * @param {string} url - Original YouTube URL or video ID
 * @param {object} options - Embed options
 * @returns {object|null} - Complete embed data or null if invalid
 */
export function createYouTubeEmbed(url, options = {}) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const embedUrl = buildEmbedUrl(videoId, options);
  const thumbnail = getThumbnailUrl(videoId, "hqdefault");

  return {
    videoId,
    url: url.includes("http") ? url : `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl,
    thumbnail,
    options: {
      autoplay: options.autoplay || false,
      controls: options.controls !== false,
      mute: options.mute || false,
      loop: options.loop || false,
      modestbranding: options.modestbranding !== false,
      rel: options.rel || false,
      showinfo: options.showinfo || false,
      fs: options.fs !== false,
      cc_load_policy: options.cc_load_policy || false,
      iv_load_policy: options.iv_load_policy || 3,
      start: options.start || null,
      end: options.end || null,
    },
  };
}

/**
 * Generate iframe HTML for YouTube embed
 * @param {object} embedData - YouTube embed data object
 * @param {object} iframeOptions - Additional iframe options (width, height, class, etc.)
 * @returns {string} - Complete iframe HTML
 */
export function generateIframeHtml(embedData, iframeOptions = {}) {
  if (!embedData || !embedData.videoId) return "";

  const {
    width = "560",
    height = "315",
    className = "",
    frameborder = "0",
    allowfullscreen = true,
    loading = "lazy",
    title = "YouTube video player",
  } = iframeOptions;

  const attributes = [
    `src="${embedData.embedUrl}"`,
    `width="${width}"`,
    `height="${height}"`,
    `title="${title}"`,
    `frameborder="${frameborder}"`,
    `loading="${loading}"`,
    allowfullscreen ? "allowfullscreen" : "",
    className ? `class="${className}"` : "",
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"',
  ].filter(Boolean);

  return `<iframe ${attributes.join(" ")}></iframe>`;
}
