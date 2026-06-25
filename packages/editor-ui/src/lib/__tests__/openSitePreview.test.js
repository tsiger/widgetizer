// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openPagePreview, openCollectionItemPreview } from "../openSitePreview";
import { setStandalonePreviewPath, setStandaloneCollectionPreviewPath } from "../previewBase";

// openPagePreview / openCollectionItemPreview are the single dispatch the standalone-
// preview call sites (top-bar Preview button, sidebar Preview, collection-item Preview)
// share. Each resolves its route through the previewBase registries, then opens it:
//   - an in-app /preview/... path -> the privileged Electron preview window (desktop), or
//   - the shared "widgetizer-preview" browser window (web + embedding-host overrides).
// A security guard refuses anything that isn't an app-relative single-slash path.
// window.open + the Electron bridge are module-global, so each test mocks/clears them
// and resets the path registries (non-function arg -> OSS default builder) in afterEach.
describe("standalone preview dispatch", () => {
  let openSpy;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open").mockReturnValue({ focus: vi.fn() });
  });

  afterEach(() => {
    openSpy.mockRestore();
    delete window.electronUpdater;
    setStandalonePreviewPath(undefined);
    setStandaloneCollectionPreviewPath(undefined);
  });

  it("opens a page preview in the shared browser window (web, no Electron bridge)", () => {
    openPagePreview("home-123");
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain("/preview/home-123");
    expect(openSpy.mock.calls[0][1]).toBe("widgetizer-preview");
  });

  it("opens a collection-item preview at /preview/collection/<prefix>/<slug>", () => {
    openCollectionItemPreview("news", "alpha");
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain("/preview/collection/news/alpha");
  });

  it("routes an in-app /preview/... path through the Electron bridge when present", () => {
    const openPreviewWindow = vi.fn();
    window.electronUpdater = { openPreviewWindow };
    openPagePreview("home-123");
    expect(openPreviewWindow).toHaveBeenCalledWith("/preview/home-123");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("opens a host-override path in the browser window, never the Electron bridge", () => {
    // A host override never installs in the desktop app, but pin the contract anyway:
    // even with a bridge present, a non-/preview/ path falls through to window.open.
    const openPreviewWindow = vi.fn();
    window.electronUpdater = { openPreviewWindow };
    setStandalonePreviewPath((pageId) => `/sites/s1/preview/${pageId}`);
    openPagePreview("home-123");
    expect(openPreviewWindow).not.toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain("/sites/s1/preview/home-123");
  });

  it("refuses a non-app-relative override (absolute or protocol-relative)", () => {
    setStandalonePreviewPath(() => "https://evil.example/preview/x");
    openPagePreview("home-123");
    setStandalonePreviewPath(() => "//evil.example/preview/x");
    openPagePreview("home-123");
    expect(openSpy).not.toHaveBeenCalled();
  });
});
