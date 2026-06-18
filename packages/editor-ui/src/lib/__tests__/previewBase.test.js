// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  getPreviewTargetOrigin,
  setPreviewRenderBase,
  getStandaloneCollectionPreviewPath,
  setStandaloneCollectionPreviewPath,
} from "../previewBase";

// getPreviewTargetOrigin() is the postMessage send-scoping helper: the editor
// targets the inline preview iframe's concrete origin (derived from the render
// base) instead of "*", so a message can't leak to an unexpected origin if the
// iframe ever navigates away. These cases cover the three deployment shapes:
//   - same-origin prod / OSS standalone (empty base)        -> this window's origin
//   - hosted nested same-origin proxy   (relative base)     -> this window's origin
//   - split dev via VITE_API_URL        (absolute base)     -> that absolute origin
// The module keeps the render base in module-level state, so each test restores
// it via setPreviewRenderBase("") in afterEach to avoid leaking into the next.
describe("getPreviewTargetOrigin", () => {
  afterEach(() => {
    setPreviewRenderBase("");
  });

  it("resolves an empty/default base to this window's origin (same-origin case)", () => {
    setPreviewRenderBase("");
    expect(getPreviewTargetOrigin()).toBe(window.location.origin);
  });

  it("resolves a relative base to this window's origin (hosted proxied same-origin case)", () => {
    setPreviewRenderBase("/api/projects/x/preview");
    expect(getPreviewTargetOrigin()).toBe(window.location.origin);
  });

  it("resolves an absolute base to that origin (split-dev cross-origin case)", () => {
    setPreviewRenderBase("http://localhost:3001");
    expect(getPreviewTargetOrigin()).toBe("http://localhost:3001");
  });

  it("uses only the origin of an absolute base, dropping any path", () => {
    setPreviewRenderBase("http://localhost:3001/render/abc123");
    expect(getPreviewTargetOrigin()).toBe("http://localhost:3001");
  });
});

// getStandaloneCollectionPreviewPath() is the path-builder the collection pages'
// "Preview" handlers read to open a collection ITEM page's standalone preview.
// The OSS shell serves it at /preview/collection/:slugPrefix/:slug (the default);
// an embedding host (hosted mounts the editor under /sites/:siteId) overrides it
// via setStandaloneCollectionPreviewPath. This mirrors the page-preview
// getStandalonePreviewPath/setStandalonePreviewPath pair: the builder is kept in
// module-level state, so each test resets it via setStandaloneCollectionPreviewPath()
// in afterEach to keep cases order-independent.
describe("getStandaloneCollectionPreviewPath", () => {
  afterEach(() => {
    // Passing a non-function resets the registry to the default builder.
    setStandaloneCollectionPreviewPath(undefined);
  });

  it("defaults to /preview/collection/<prefix>/<slug> (OSS standalone shell)", () => {
    expect(getStandaloneCollectionPreviewPath("news", "alpha")).toBe("/preview/collection/news/alpha");
  });

  it("returns the host path after setStandaloneCollectionPreviewPath() installs a custom builder", () => {
    setStandaloneCollectionPreviewPath(
      (prefix, slug) => `/sites/s1/preview/collection/${prefix}/${slug}`,
    );
    expect(getStandaloneCollectionPreviewPath("news", "alpha")).toBe(
      "/sites/s1/preview/collection/news/alpha",
    );
  });

  it("resets to the default when passed a non-function", () => {
    setStandaloneCollectionPreviewPath((prefix, slug) => `/custom/${prefix}/${slug}`);
    expect(getStandaloneCollectionPreviewPath("news", "alpha")).toBe("/custom/news/alpha");

    setStandaloneCollectionPreviewPath("not-a-function");
    expect(getStandaloneCollectionPreviewPath("news", "alpha")).toBe("/preview/collection/news/alpha");
  });
});
