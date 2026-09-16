/**
 * Upload file-name normalization.
 *
 * The stored name is a contract: sanitizationService's image-path allowlist and the
 * media scanner both assume `[a-z0-9-]` plus a lower-case extension.
 *
 * Run with: node --test packages/builder-server/src/tests/uploadFileName.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeUploadName, MAX_UPLOAD_NAME_LENGTH } from "../utils/uploadFileName.js";

const SAFE_IMAGE_PATH_RE = /^\/[A-Za-z0-9._/-]+$/;

describe("normalizeUploadName — separators", () => {
  it("turns spaces, underscores, inner dots and punctuation into single hyphens", () => {
    assert.equal(normalizeUploadName("filename_like_that.jpg"), "filename-like-that.jpg");
    assert.equal(normalizeUploadName("My Photo 01.JPG"), "my-photo-01.jpg");
    assert.equal(normalizeUploadName("hero.v2.png"), "hero-v2.png");
    assert.equal(normalizeUploadName("logo (final)_v2.svg"), "logo-final-v2.svg");
    assert.equal(normalizeUploadName("a--b__c .png"), "a-b-c.png");
    assert.equal(normalizeUploadName("invoice_2026_09_15_client#4412.pdf"), "invoice-2026-09-15-client-4412.pdf");
  });

  it("keeps digits attached to their word", () => {
    assert.equal(normalizeUploadName("IMG_4032.jpg"), "img-4032.jpg");
    assert.equal(normalizeUploadName("DSC0912.JPG"), "dsc0912.jpg");
  });

  it("leaves an already clean name alone", () => {
    assert.equal(normalizeUploadName("hero-image.jpg"), "hero-image.jpg");
  });
});

describe("normalizeUploadName — letters", () => {
  it("lower-cases the extension too", () => {
    assert.equal(normalizeUploadName("PHOTO.JPEG"), "photo.jpeg");
  });

  it("flattens accents and transliterates other scripts", () => {
    assert.equal(normalizeUploadName("Café déjà vu.png"), "cafe-deja-vu.png");
    assert.equal(normalizeUploadName("Müller Straße.png"), "muller-strasse.png");
    assert.equal(normalizeUploadName("Привет мир.png"), "privet-mir.png");
    assert.match(normalizeUploadName("ελληνικά-φωτο.png"), /^[a-z-]+\.png$/);
  });

  it("treats a decomposed accent as part of its letter (NFC/NFD agree)", () => {
    const pairs = [
      ["Müller.png", "Müller.png", "muller.png"],
      ["résumé.jpg", "résumé.jpg", "resume.jpg"],
      ["Cáfé photo.png", "Cáfé photo.png", "cafe-photo.png"],
    ];
    for (const [composed, decomposed, expected] of pairs) {
      assert.equal(normalizeUploadName(composed), expected, `NFC form of ${expected}`);
      assert.equal(normalizeUploadName(decomposed), expected, `NFD form of ${expected}`);
    }
  });

  it("falls back when nothing survives transliteration", () => {
    assert.equal(normalizeUploadName("東京.png", { fallback: "image" }), "image.png");
    assert.equal(normalizeUploadName("🔥🔥.png", { fallback: "image" }), "image.png");
    assert.equal(normalizeUploadName("서울.pdf"), "file.pdf");
  });

  it("does not produce a hidden file from a leading dot", () => {
    assert.equal(normalizeUploadName(".env.png"), "env.png");
  });
});

describe("normalizeUploadName — length", () => {
  const long = "Bakery interior wide angle morning light with customers queueing at the counter 2026.jpg";

  it("cuts a long name on a word boundary, extension kept", () => {
    const name = normalizeUploadName(long);
    assert.ok(name.length <= MAX_UPLOAD_NAME_LENGTH + ".jpg".length, name);
    assert.ok(name.endsWith(".jpg"));
    assert.ok(!name.includes("--") && !name.startsWith("-"));
    assert.ok(!/-\.jpg$/.test(name), "no dangling hyphen before the extension");
    assert.ok(name.startsWith("bakery-interior-wide-angle"), name);
  });

  it("cuts mid-word only when there is no usable boundary", () => {
    const name = normalizeUploadName(`${"x".repeat(200)}.png`);
    assert.equal(name, `${"x".repeat(MAX_UPLOAD_NAME_LENGTH)}.png`);
  });
});

describe("normalizeUploadName — stored-charset contract", () => {
  it("always yields a path the image-path allowlist accepts", () => {
    const inputs = [
      "東京.png",
      "Café déjà vu.png",
      'x" onerror="alert(1).jpg',
      "../../secret.png",
      "sub/dir/photo.png",
      "file name with spaces.PNG",
      "🔥🔥.png",
    ];
    for (const input of inputs) {
      const name = normalizeUploadName(input, { fallback: "image" });
      assert.match(`/uploads/images/${name}`, SAFE_IMAGE_PATH_RE, `rejected for ${input}`);
      assert.ok(!name.includes(".."), `traversal survived for ${input}`);
      assert.ok(!name.includes("/") && !name.includes("\\"), `separator survived for ${input}`);
    }
  });

  it("handles a missing or odd extension", () => {
    assert.equal(normalizeUploadName("plain name"), "plain-name");
    assert.equal(normalizeUploadName("archive.TAR.GZ"), "archive-tar.gz");
    assert.equal(normalizeUploadName(""), "file");
    assert.equal(normalizeUploadName(undefined), "file");
  });
});
