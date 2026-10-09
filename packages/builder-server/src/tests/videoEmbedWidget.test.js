/**
 * Arch's video-embed widget with an uploaded MP4.
 *
 * Renders the real widget through renderWidget() in both modes: an uploaded
 * video wins over the YouTube/Vimeo URL, resolves through the render's file
 * base (editor media route in preview, depth-prefixed assets/files/ on
 * export), and never reaches the page as a raw storage path or an empty src.
 *
 * Run with: node --test packages/builder-server/src/tests/videoEmbedWidget.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-video-embed-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.resolve("themes");
process.env.NODE_ENV = "test";

const { getProjectDir, getProjectPagesDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { renderWidget } = await import("../services/renderingService.js");
const { closeDb } = await import("../db/index.js");

const PROJECT_ID = "video-embed-test-uuid";
const PROJECT_FOLDER = "video-embed-test";
const YOUTUBE = "https://www.youtube.com/watch?v=2PuFyjAs7JA";
const THEME_SETTINGS = { settings: { global: {} } };

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Video Embed Test",
        theme: "arch",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));
  await fs.copy(path.resolve("themes/arch/widgets/video-embed"), path.join(projectDir, "widgets", "video-embed"));
  await fs.copy(path.resolve("themes/arch/widgets/video-popup"), path.join(projectDir, "widgets", "video-popup"));
  await fs.copy(path.resolve("themes/arch/locales"), path.join(projectDir, "locales"));
  await writeMediaFile(PROJECT_ID, {
    files: [
      {
        id: "poster-1",
        filename: "tour-poster.jpg",
        type: "image/jpeg",
        path: "/uploads/images/tour-poster.jpg",
        width: 1600,
        height: 900,
        sizes: { large: { path: "/uploads/images/tour-poster-large.jpg", width: 1280, height: 720 } },
        metadata: { alt: "", title: "" },
      },
      { id: "video-1", filename: "tour.mp4", type: "video/mp4", path: "/uploads/files/tour.mp4" },
    ],
  });
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

function markup(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
}

async function render(settings, { mode = "preview", prefix = "", type = "video-embed" } = {}) {
  const globals = {
    projectId: PROJECT_ID,
    apiUrl: "",
    renderMode: mode,
    outputPathPrefix: prefix,
    enqueuedStyles: new Map(),
    enqueuedScripts: new Map(),
  };
  const html = await renderWidget(
    PROJECT_ID,
    "video-1",
    { type, settings: { video_url: YOUTUBE, ...settings } },
    THEME_SETTINGS,
    mode,
    globals,
    null,
  );
  const scripts = [...globals.enqueuedScripts.keys()].join(" ");
  return { html: markup(html), scripts };
}

const videoTag = (html) => html.match(/<video[\s\S]*?<\/video>/)?.[0] ?? "";

describe("video-embed with an uploaded MP4", () => {
  it("plays the upload instead of the YouTube URL, from the editor's media route", async () => {
    const { html, scripts } = await render({ video_file: "/uploads/files/tour.mp4", video_title: "Product tour" });
    const video = videoTag(html);

    assert.ok(video, html);
    assert.ok(video.includes(`src="/api/media/projects/${PROJECT_ID}/uploads/files/tour.mp4"`), video);
    for (const attribute of ["controls", "playsinline", 'preload="metadata"', 'aria-label="Product tour"']) {
      assert.ok(video.includes(attribute), `${attribute} missing: ${video}`);
    }
    assert.ok(!/autoplay/.test(video));
    assert.ok(!video.includes("data-setting"), "a live update would write the raw upload path into src");
    assert.ok(!html.includes("<iframe"));
    assert.ok(/<p class="video-embed-error[^"]*" role="alert" hidden>This video can&#39;t be played in your browser\.<\/p>/.test(html), html);
    assert.ok(scripts.includes("video-embed.js"));
  });

  it("goes back to the YouTube embed when the upload is cleared", async () => {
    const { html, scripts } = await render({ video_file: "" });
    assert.ok(html.includes('src="https://www.youtube.com/embed/2PuFyjAs7JA"'), html);
    assert.ok(!html.includes("<video"));
    assert.ok(!html.includes("video-embed-error"));
    assert.ok(!scripts.includes("video-embed.js"));
  });

  it("adds a poster only when one is chosen", async () => {
    const withPoster = videoTag((await render({ video_file: "/uploads/files/tour.mp4", poster: "/uploads/images/tour-poster.jpg" })).html);
    assert.match(withPoster, new RegExp(`poster="/api/media/projects/${PROJECT_ID}/uploads/images/tour-poster-large\\.jpg"`));

    const withoutPoster = videoTag((await render({ video_file: "/uploads/files/tour.mp4" })).html);
    assert.ok(withoutPoster);
    assert.ok(!withoutPoster.includes("poster="));
  });

  it("renders no player and no empty src when nothing is set", async () => {
    const { html } = await render({ video_file: "", video_url: "" }, { mode: "publish" });
    assert.ok(!html.includes("<video"));
    assert.ok(!html.includes("<iframe"));
    assert.ok(!/src=""/.test(html));
  });

  it("ignores a value that is not an uploaded MP4, and escapes the title", async () => {
    for (const bad of ['/uploads/files/x" onerror="alert(1).mp4', "/uploads/files/song.mp3", "https://cdn.example/tour.mp4"]) {
      const { html } = await render({ video_file: bad });
      assert.ok(!html.includes("<video"), bad);
      assert.ok(!html.includes("onerror"), bad);
      assert.ok(html.includes("youtube.com/embed/"), bad);
    }

    const { html } = await render({ video_file: "/uploads/files/tour.mp4", video_title: '"><script>alert(1)</script>' });
    assert.ok(videoTag(html).includes('aria-label="&#34;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'), videoTag(html));
  });

  it("points an exported page at assets/files/ at its own depth", async () => {
    const settings = { video_file: "/uploads/files/tour.mp4", poster: "/uploads/images/tour-poster.jpg" };

    const root = videoTag((await render(settings, { mode: "publish" })).html);
    assert.ok(root.includes('src="assets/files/tour.mp4"'), root);
    assert.ok(root.includes('poster="assets/images/tour-poster-large.jpg"'), root);

    const nested = videoTag((await render(settings, { mode: "publish", prefix: "../" })).html);
    assert.ok(nested.includes('src="../assets/files/tour.mp4"'), nested);
    assert.ok(nested.includes('poster="../assets/images/tour-poster-large.jpg"'), nested);
  });
});

// The embed address is always built from the video's ID, never copied from what
// the owner typed, so a frame can only point at YouTube or Vimeo.
describe("YouTube and Vimeo addresses", () => {
  const embedFor = async (type, video_url) => {
    const { html } = await render({ video_url }, { type });
    const match = type === "video-popup" ? html.match(/data-video-url="([^"]*)"/) : html.match(/<iframe[^>]*\ssrc="([^"]*)"/);
    return match?.[1] ?? "";
  };

  for (const type of ["video-embed", "video-popup"]) {
    it(`${type}: turns each supported form into an embed address`, async () => {
      const cases = {
        "https://www.youtube.com/watch?v=c9OnQEHUpvI": "https://www.youtube.com/embed/c9OnQEHUpvI",
        "https://youtu.be/c9OnQEHUpvI?si=abc": "https://www.youtube.com/embed/c9OnQEHUpvI",
        "https://www.youtube.com/embed/c9OnQEHUpvI?start=30": "https://www.youtube.com/embed/c9OnQEHUpvI?start=30",
        "https://vimeo.com/76979871": "https://player.vimeo.com/video/76979871",
        "https://player.vimeo.com/video/76979871?h=8272103f6e": "https://player.vimeo.com/video/76979871?h=8272103f6e",
        // A fragment would swallow the popup's "&autoplay=1"; a second "?" stays inside the options.
        "https://www.youtube.com/embed/c9OnQEHUpvI?start=30#chapter": "https://www.youtube.com/embed/c9OnQEHUpvI?start=30",
        "https://www.youtube.com/embed/c9OnQEHUpvI?ref=https://site.example/a?b=1":
          "https://www.youtube.com/embed/c9OnQEHUpvI?ref=https://site.example/a?b=1",
        "https://www.youtube.com/embed/c9OnQEHUpvI/": "https://www.youtube.com/embed/c9OnQEHUpvI",
      };
      const got = {};
      for (const typed of Object.keys(cases)) got[typed] = await embedFor(type, typed);
      assert.deepEqual(got, cases);
    });

    it(`${type}: never frames another site that merely mentions YouTube or Vimeo`, async () => {
      for (const typed of ["https://any-site.example/?youtube.com/embed/x", "https://any-site.example/player.vimeo.com/video/1"]) {
        const embed = await embedFor(type, typed);
        assert.ok(!embed.includes("any-site.example"), `${typed} -> ${embed}`);
        assert.match(embed, /^https:\/\/(www\.youtube\.com\/embed|player\.vimeo\.com\/video)\//, typed);
      }
    });

    it(`${type}: gives no player for an ID that would leave the embed path`, async () => {
      for (const typed of [
        "https://www.youtube.com/embed/../../watch?v=c9OnQEHUpvI",
        "https://youtu.be/%2e%2e/watch",
        "https://player.vimeo.com/video/..",
        "https://www.youtube.com/embed/",
      ]) {
        assert.equal(await embedFor(type, typed), "", typed);
      }
    });
  }
});
