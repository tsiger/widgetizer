/**
 * MIME single-source-of-truth test (F9).
 *
 * Pins that builder-server and the local asset adapter resolve content types
 * from ONE canonical map in @widgetizer/core — no silent drift. Before the fix,
 * builder-server didn't know `.avif` and the adapter didn't know `.pdf`.
 *
 * Run with: node --test packages/builder-server/src/tests/mimeTypes.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getContentType as coreGet } from "@widgetizer/core/mimeTypes";
import { getContentType as builderGet, ALLOWED_MIME_TYPES } from "../utils/mimeTypes.js";

describe("MIME single source of truth", () => {
  it("builder-server re-exports core's getContentType (same function)", () => {
    assert.equal(builderGet, coreGet);
  });

  it("knows .avif (was adapter-only before)", () => {
    assert.equal(coreGet(".avif"), "image/avif");
    assert.equal(builderGet(".avif"), "image/avif");
  });

  it("knows .pdf (was builder-only before)", () => {
    assert.equal(coreGet(".pdf"), "application/pdf");
    assert.equal(builderGet(".pdf"), "application/pdf");
  });

  it("knows .mp3 (audio)", () => {
    assert.equal(coreGet(".mp3"), "audio/mpeg");
    assert.equal(builderGet(".mp3"), "audio/mpeg");
  });

  it("falls back to octet-stream for unknown extensions", () => {
    assert.equal(coreGet(".nope"), "application/octet-stream");
  });
});

describe("MIME upload allowlist", () => {
  it("accepts mp3 audio uploads (audio/mpeg + audio/mp3)", () => {
    assert.ok(ALLOWED_MIME_TYPES.includes("audio/mpeg"));
    assert.ok(ALLOWED_MIME_TYPES.includes("audio/mp3"));
  });
});
