/**
 * Render-time richtext media resolution (src/core/utils/richtextMedia.js).
 *
 * Embedded `/uploads/images|files/…` paths in richtext are rewritten to the active
 * render mode's served base — the live media route in preview, `assets/…` in export —
 * automatically, with no template filter. Covers the string rewrite plus the flat and
 * widget (settings + blocks) walkers.
 *
 * Run with: node --test server/tests/richtextMedia.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolveRichtextMediaPaths,
  resolveRichtextMediaInSettings,
  resolveRichtextMediaInWidgetData,
} from "@widgetizer/core/richtextMedia";

const PREVIEW_IMG = "http://localhost:3001/api/media/projects/p1/uploads/images";
const PREVIEW_FILE = "http://localhost:3001/api/media/projects/p1/uploads/files";

describe("resolveRichtextMediaPaths", () => {
  it("rewrites embedded image paths to the live media route (preview)", () => {
    const out = resolveRichtextMediaPaths('<img src="/uploads/images/photo-large.jpg">', PREVIEW_IMG, PREVIEW_FILE);
    assert.equal(out, `<img src="${PREVIEW_IMG}/photo-large.jpg">`);
    assert.doesNotMatch(out, /src="\/uploads\/images/);
  });

  it("rewrites embedded image paths to assets/ (publish)", () => {
    assert.equal(
      resolveRichtextMediaPaths('<img src="/uploads/images/a.jpg">', "assets/images", "assets/files"),
      '<img src="assets/images/a.jpg">',
    );
  });

  it("honors the item-page depth prefix baked into the base", () => {
    assert.equal(
      resolveRichtextMediaPaths('<img src="/uploads/images/a.jpg">', "../assets/images", "../assets/files"),
      '<img src="../assets/images/a.jpg">',
    );
  });

  it("rewrites file links too, and every occurrence, leaving other content alone", () => {
    const out = resolveRichtextMediaPaths(
      '<img src="/uploads/images/a.jpg"><a href="/uploads/files/spec.pdf">x</a><a href="https://x.com">y</a>',
      "assets/images",
      "assets/files",
    );
    assert.match(out, /assets\/images\/a\.jpg/);
    assert.match(out, /assets\/files\/spec\.pdf/);
    assert.match(out, /href="https:\/\/x\.com"/);
    assert.doesNotMatch(out, /\/uploads\//);
  });

  it("leaves /uploads/ inside a longer URL or in prose untouched (anchored to attributes)", () => {
    const html =
      '<a href="https://example.com/uploads/files/spec.pdf">ext</a>' +
      "<p>Visit /uploads/images/foo.jpg for details</p>" +
      '<img src="/uploads/images/real.jpg">';
    const out = resolveRichtextMediaPaths(html, "assets/images", "assets/files");
    assert.match(out, /href="https:\/\/example\.com\/uploads\/files\/spec\.pdf"/, "external URL not mangled");
    assert.match(out, /Visit \/uploads\/images\/foo\.jpg for details/, "prose text not rewritten");
    assert.match(out, /src="assets\/images\/real\.jpg"/, "real attribute IS rewritten");
  });

  it("rewrites only src/href values — not class/alt that happen to start with an upload path", () => {
    const html = '<img src="/uploads/images/real.jpg" alt="/uploads/images/not-a-path" class="/uploads/x">';
    const out = resolveRichtextMediaPaths(html, "assets/images", "assets/files");
    assert.match(out, /src="assets\/images\/real\.jpg"/, "src is rewritten");
    assert.match(out, /alt="\/uploads\/images\/not-a-path"/, "alt is left untouched");
    assert.match(out, /class="\/uploads\/x"/, "class is left untouched");
  });

  it("passes through when bases are missing or value is blank/non-string", () => {
    assert.equal(resolveRichtextMediaPaths('<img src="/uploads/images/a.jpg">'), '<img src="/uploads/images/a.jpg">');
    assert.equal(resolveRichtextMediaPaths("", "assets/images", "assets/files"), "");
    assert.equal(resolveRichtextMediaPaths(null, "assets/images", "assets/files"), null);
  });
});

describe("resolveRichtextMediaInSettings", () => {
  const schemaSettings = [
    { id: "title", type: "text" },
    { id: "body", type: "richtext" },
    { id: "caption", type: "textarea" },
  ];

  it("rewrites only richtext-typed fields, leaving other types untouched", () => {
    const settings = {
      title: "Has a /uploads/images/x.jpg mention but is plain text",
      body: '<img src="/uploads/images/hero-large.jpg">',
      caption: "/uploads/images/y.jpg",
    };
    resolveRichtextMediaInSettings(settings, schemaSettings, "assets/images", "assets/files");
    assert.equal(settings.body, '<img src="assets/images/hero-large.jpg">');
    // text + textarea fields are NOT touched (they're escaped/handled elsewhere).
    assert.match(settings.title, /\/uploads\/images\/x\.jpg/);
    assert.equal(settings.caption, "/uploads/images/y.jpg");
  });

  it("no-ops on missing settings or schema", () => {
    assert.doesNotThrow(() => resolveRichtextMediaInSettings(null, schemaSettings, "a", "b"));
    assert.doesNotThrow(() => resolveRichtextMediaInSettings({}, null, "a", "b"));
  });
});

describe("resolveRichtextMediaInWidgetData", () => {
  it("resolves richtext in top-level settings and inside block settings", () => {
    const schema = {
      settings: [{ id: "intro", type: "richtext" }],
      blocks: [{ type: "card", settings: [{ id: "text", type: "richtext" }] }],
    };
    const widgetData = {
      settings: { intro: '<img src="/uploads/images/intro-large.jpg">' },
      blocks: {
        b1: { type: "card", settings: { text: '<img src="/uploads/images/card.png">' } },
        b2: { type: "unknown", settings: { text: '<img src="/uploads/images/skip.png">' } },
      },
    };
    resolveRichtextMediaInWidgetData(widgetData, schema, "assets/images", "assets/files");
    assert.equal(widgetData.settings.intro, '<img src="assets/images/intro-large.jpg">');
    assert.equal(widgetData.blocks.b1.settings.text, '<img src="assets/images/card.png">');
    // A block whose type isn't in the schema is left alone.
    assert.equal(widgetData.blocks.b2.settings.text, '<img src="/uploads/images/skip.png">');
  });
});
