import { describe, it, expect } from "vitest";
import {
  extractVideoId,
  validateYouTubeUrl,
  getThumbnailUrl,
  buildEmbedUrl,
  createYouTubeEmbed,
  generateIframeHtml,
} from "../youtubeHelpers";

// ============================================================================
// extractVideoId
// ============================================================================

describe("extractVideoId", () => {
  it("extracts from standard watch URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from short URL", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from embed URL", () => {
    expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from mobile URL", () => {
    expect(extractVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from gaming URL", () => {
    expect(extractVideoId("https://gaming.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("accepts a bare 11-character video ID", () => {
    expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("accepts IDs with dashes and underscores", () => {
    expect(extractVideoId("a-b_c1D2e3F")).toBe("a-b_c1D2e3F");
  });

  it("extracts from URL with extra query params", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe("dQw4w9WgXcQ");
  });

  it("trims whitespace", () => {
    expect(extractVideoId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for empty string", () => {
    expect(extractVideoId("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(extractVideoId(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractVideoId(undefined)).toBeNull();
  });

  it("returns null for non-string", () => {
    expect(extractVideoId(12345)).toBeNull();
  });

  it("returns null for random URL", () => {
    expect(extractVideoId("https://example.com/some-page")).toBeNull();
  });

  it("returns null for ID that is too short", () => {
    expect(extractVideoId("abc123")).toBeNull();
  });

  it("returns null for ID that is too long", () => {
    expect(extractVideoId("dQw4w9WgXcQx")).toBeNull();
  });
});

// ============================================================================
// validateYouTubeUrl
// ============================================================================

describe("validateYouTubeUrl", () => {
  it("returns true for a valid YouTube URL", () => {
    expect(validateYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("returns true for a bare video ID", () => {
    expect(validateYouTubeUrl("dQw4w9WgXcQ")).toBe(true);
  });

  it("returns false for an invalid URL", () => {
    expect(validateYouTubeUrl("not-a-url")).toBe(false);
  });

  it("returns false for null", () => {
    expect(validateYouTubeUrl(null)).toBe(false);
  });
});

// ============================================================================
// getThumbnailUrl
// ============================================================================

describe("getThumbnailUrl", () => {
  it("returns hqdefault thumbnail by default", () => {
    expect(getThumbnailUrl("dQw4w9WgXcQ")).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("accepts each valid quality", () => {
    const qualities = ["default", "hqdefault", "mqdefault", "sddefault", "maxresdefault"];
    for (const q of qualities) {
      expect(getThumbnailUrl("abc12345678", q)).toBe(`https://img.youtube.com/vi/abc12345678/${q}.jpg`);
    }
  });

  it("falls back to hqdefault for invalid quality", () => {
    expect(getThumbnailUrl("dQw4w9WgXcQ", "ultraHD")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("returns empty string for falsy videoId", () => {
    expect(getThumbnailUrl("")).toBe("");
    expect(getThumbnailUrl(null)).toBe("");
    expect(getThumbnailUrl(undefined)).toBe("");
  });
});

// ============================================================================
// buildEmbedUrl
// ============================================================================

describe("buildEmbedUrl", () => {
  it("builds a basic embed URL with defaults", () => {
    const url = buildEmbedUrl("dQw4w9WgXcQ");
    expect(url).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ?");
    // Check some default params
    expect(url).toContain("controls=1");
    expect(url).toContain("rel=0");
    expect(url).toContain("modestbranding=1");
  });

  it("converts boolean true to 1", () => {
    const url = buildEmbedUrl("dQw4w9WgXcQ", { autoplay: true });
    expect(url).toContain("autoplay=1");
  });

  it("converts boolean false to 0", () => {
    const url = buildEmbedUrl("dQw4w9WgXcQ", { controls: false });
    expect(url).toContain("controls=0");
  });

  it("strips null and undefined values", () => {
    // start and end default to null, so they should be absent
    const url = buildEmbedUrl("dQw4w9WgXcQ");
    expect(url).not.toContain("start=");
    expect(url).not.toContain("end=");
  });

  it("includes start/end when provided", () => {
    const url = buildEmbedUrl("dQw4w9WgXcQ", { start: 30, end: 120 });
    expect(url).toContain("start=30");
    expect(url).toContain("end=120");
  });

  it("returns empty string for falsy videoId", () => {
    expect(buildEmbedUrl("")).toBe("");
    expect(buildEmbedUrl(null)).toBe("");
  });
});

// ============================================================================
// createYouTubeEmbed
// ============================================================================

describe("createYouTubeEmbed", () => {
  it("returns a complete embed object from a URL", () => {
    const embed = createYouTubeEmbed("https://youtu.be/dQw4w9WgXcQ");
    expect(embed).not.toBeNull();
    expect(embed.videoId).toBe("dQw4w9WgXcQ");
    expect(embed.url).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(embed.embedUrl).toContain("youtube.com/embed/dQw4w9WgXcQ");
    expect(embed.thumbnail).toContain("hqdefault.jpg");
  });

  it("constructs a full URL when given a bare ID", () => {
    const embed = createYouTubeEmbed("dQw4w9WgXcQ");
    expect(embed.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("applies option defaults correctly", () => {
    const embed = createYouTubeEmbed("dQw4w9WgXcQ");
    expect(embed.options.autoplay).toBe(false);
    expect(embed.options.controls).toBe(true);
    expect(embed.options.fs).toBe(true);
    expect(embed.options.modestbranding).toBe(true);
    expect(embed.options.start).toBeNull();
    expect(embed.options.end).toBeNull();
  });

  it("respects provided options", () => {
    const embed = createYouTubeEmbed("dQw4w9WgXcQ", { autoplay: true, mute: true, start: 10 });
    expect(embed.options.autoplay).toBe(true);
    expect(embed.options.mute).toBe(true);
    expect(embed.options.start).toBe(10);
  });

  it("returns null for invalid input", () => {
    expect(createYouTubeEmbed("not-valid")).toBeNull();
    expect(createYouTubeEmbed("")).toBeNull();
    expect(createYouTubeEmbed(null)).toBeNull();
  });
});

// ============================================================================
// generateIframeHtml
// ============================================================================

describe("generateIframeHtml", () => {
  const embed = createYouTubeEmbed("dQw4w9WgXcQ");

  it("generates a valid iframe element", () => {
    const html = generateIframeHtml(embed);
    expect(html).toContain("<iframe ");
    expect(html).toContain("</iframe>");
    expect(html).toContain('src="');
    expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
  });

  it("uses default dimensions", () => {
    const html = generateIframeHtml(embed);
    expect(html).toContain('width="560"');
    expect(html).toContain('height="315"');
  });

  it("applies custom dimensions", () => {
    const html = generateIframeHtml(embed, { width: "100%", height: "400" });
    expect(html).toContain('width="100%"');
    expect(html).toContain('height="400"');
  });

  it("includes allowfullscreen by default", () => {
    const html = generateIframeHtml(embed);
    expect(html).toContain("allowfullscreen");
  });

  it("omits allowfullscreen when disabled", () => {
    const html = generateIframeHtml(embed, { allowfullscreen: false });
    expect(html).not.toContain("allowfullscreen");
  });

  it("adds class attribute when className is provided", () => {
    const html = generateIframeHtml(embed, { className: "video-frame" });
    expect(html).toContain('class="video-frame"');
  });

  it("omits class attribute when className is empty", () => {
    const html = generateIframeHtml(embed);
    expect(html).not.toContain("class=");
  });

  it("sets lazy loading by default", () => {
    const html = generateIframeHtml(embed);
    expect(html).toContain('loading="lazy"');
  });

  it("returns empty string for null embedData", () => {
    expect(generateIframeHtml(null)).toBe("");
  });

  it("returns empty string for embedData without videoId", () => {
    expect(generateIframeHtml({ embedUrl: "something" })).toBe("");
  });
});
