/**
 * Media upload file-filter test suite.
 *
 * Pins that upload acceptance checks BOTH the declared MIME type and the file
 * extension. The declared multipart Content-Type is attacker-controlled and
 * the serve side derives the response Content-Type from the stored extension,
 * so a `x.html` upload declared as an allowed MIME must be rejected — stored
 * and later served as text/html it would execute in the browser (stored XSS
 * on an embedding host's app origin).
 *
 * Run with: node --test packages/builder-server/src/tests/mediaUploadFilter.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-upload-filter-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { mediaUploadFileFilter } = await import("../controllers/mediaController.js");

// Run the multer fileFilter and capture its verdict.
function filter(originalname, mimetype) {
  let verdict;
  mediaUploadFileFilter(null, { originalname, mimetype }, (err, accepted) => {
    verdict = { err, accepted };
  });
  return verdict;
}

function assertAccepted({ err, accepted }, label) {
  assert.equal(err, null, `${label}: expected no error, got: ${err?.message}`);
  assert.equal(accepted, true, `${label}: expected acceptance`);
}

function assertRejected({ err, accepted }, label) {
  assert.ok(err instanceof Error, `${label}: expected a rejection error`);
  assert.equal(accepted, false, `${label}: expected rejection`);
}

describe("media upload file filter", () => {
  it("accepts legitimate uploads (matching extension + MIME)", () => {
    assertAccepted(filter("photo.jpg", "image/jpeg"), "jpg");
    assertAccepted(filter("photo.jpeg", "image/jpeg"), "jpeg");
    assertAccepted(filter("logo.png", "image/png"), "png");
    assertAccepted(filter("anim.gif", "image/gif"), "gif");
    assertAccepted(filter("pic.webp", "image/webp"), "webp");
    assertAccepted(filter("icon.svg", "image/svg+xml"), "svg");
    assertAccepted(filter("doc.pdf", "application/pdf"), "pdf");
    assertAccepted(filter("song.mp3", "audio/mpeg"), "mp3 audio/mpeg");
    assertAccepted(filter("song.mp3", "audio/mp3"), "mp3 audio/mp3");
  });

  it("accepts uppercase extensions", () => {
    assertAccepted(filter("PHOTO.JPG", "image/jpeg"), "uppercase jpg");
  });

  it("rejects a disallowed MIME type regardless of extension", () => {
    assertRejected(filter("page.html", "text/html"), "html mime");
    assertRejected(filter("photo.jpg", "text/html"), "html mime, jpg name");
  });

  it("rejects an allowed MIME paired with a disallowed extension (crafted upload)", () => {
    // A declared Content-Type can pass the MIME allowlist while a stored
    // `.html` extension would make the serve side respond `text/html`.
    assertRejected(filter("x.html", "application/pdf"), "html as pdf");
    assertRejected(filter("x.svg.html", "image/svg+xml"), "html as svg");
    assertRejected(filter("x.xhtml", "image/png"), "xhtml as png");
    assertRejected(filter("x", "application/pdf"), "no extension");
  });

  it("rejects mismatched pairs even when both MIME and extension are allowed", () => {
    // Processing branches on MIME while serving branches on extension. In
    // particular, an SVG declared as JPEG would otherwise skip SVG sanitizing.
    assertRejected(filter("evil.svg", "image/jpeg"), "svg declared as jpeg");
    assertRejected(filter("photo.jpg", "image/svg+xml"), "jpeg declared as svg");
    assertRejected(filter("doc.pdf", "image/png"), "pdf declared as png");
    assertRejected(filter("song.mp3", "application/pdf"), "mp3 declared as pdf");
  });
});
