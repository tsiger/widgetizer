import { describe, it, expect } from "vitest";
import { isSafePreviewPath, SAFE_PREVIEW_PATH } from "./previewPath.js";

// The preview BrowserWindow carries the app preload bridge, so the previewPath
// arriving over IPC is untrusted. isSafePreviewPath is the security boundary that
// keeps a hostile path from loading remote content into that privileged window,
// so its accept/reject behaviour is pinned here.
describe("isSafePreviewPath", () => {
  it("accepts a page-id preview path", () => {
    expect(isSafePreviewPath("/preview/contact")).toBe(true);
    expect(isSafePreviewPath("/preview/About_Us-2")).toBe(true);
  });

  it("accepts a collection item preview path", () => {
    expect(isSafePreviewPath("/preview/collection/rooms/deluxe-suite")).toBe(true);
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(isSafePreviewPath("//evil.com/x")).toBe(false);
    expect(isSafePreviewPath("https://evil.com")).toBe(false);
    expect(isSafePreviewPath("/preview/http://evil.com")).toBe(false);
  });

  it("rejects path traversal and stray slashes in a page id", () => {
    expect(isSafePreviewPath("/preview/../secret")).toBe(false);
    expect(isSafePreviewPath("/preview/a/b")).toBe(false);
  });

  it("rejects malformed collection paths", () => {
    expect(isSafePreviewPath("/preview/collection/rooms")).toBe(false); // missing slug
    expect(isSafePreviewPath("/preview/collection/Rooms/Deluxe")).toBe(false); // uppercase
    expect(isSafePreviewPath("/preview/collection//x")).toBe(false); // empty prefix
  });

  it("rejects empty, non-/preview, and trailing-slash paths", () => {
    expect(isSafePreviewPath("/preview/")).toBe(false);
    expect(isSafePreviewPath("/preview")).toBe(false);
    expect(isSafePreviewPath("/other/contact")).toBe(false);
    expect(isSafePreviewPath("/preview/contact/")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isSafePreviewPath(undefined)).toBe(false);
    expect(isSafePreviewPath(null)).toBe(false);
    expect(isSafePreviewPath(42)).toBe(false);
    expect(isSafePreviewPath({})).toBe(false);
  });

  it("exports the regex the electron main process applies", () => {
    expect(SAFE_PREVIEW_PATH).toBeInstanceOf(RegExp);
  });
});
