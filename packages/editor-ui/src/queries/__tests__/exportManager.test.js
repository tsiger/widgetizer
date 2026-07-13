/**
 * Export browser-navigation URL builders.
 *
 * View and Download are real browser navigations (window.open / <a download>),
 * NOT editorFetch calls — so their URLs must be ABSOLUTE. The relative apiBase
 * ("/api") resolves against the Vite dev origin (which has no API proxy) and
 * 404s with the SPA shell. These builders must therefore route through API_URL
 * (which prepends the configured host) while keeping the getApiBase() scope
 * prefix (OSS "/api", hosted "/api/projects/:id").
 *
 * Regression guard for the dev-only "export view 404 / corrupt zip" bug.
 */

import { describe, it, expect, afterEach, vi } from "vitest";

// Stand in for lib/config's API_URL so the test controls the absolute host the
// way VITE_API_URL does at runtime. If a builder stops routing through API_URL
// (the original bug), its output won't carry this host prefix and the test fails.
vi.mock("../../lib/config", () => ({
  API_URL: (path) => `http://api.test${path}`,
}));

import { getExportViewUrl, getExportDownloadUrl } from "../exportManager";
import { setApiBase } from "../../lib/apiBase";

afterEach(() => {
  setApiBase("/api"); // restore the OSS default (module singleton)
});

describe("getExportViewUrl", () => {
  it("OSS: builds an absolute URL through the host + /api scope", () => {
    setApiBase("/api");
    expect(getExportViewUrl("site-v1", "index.html")).toBe(
      "http://api.test/api/export/view/site-v1/index.html",
    );
  });

  it("hosted: includes the project-scoped apiBase prefix", () => {
    setApiBase("/api/projects/p1");
    expect(getExportViewUrl("site-v1", "index.html")).toBe(
      "http://api.test/api/projects/p1/export/view/site-v1/index.html",
    );
  });

  it("is absolute (carries the host), never a bare relative /api path", () => {
    setApiBase("/api");
    const url = getExportViewUrl("site-v1", "__export__issues.html");
    expect(url.startsWith("http://api.test")).toBe(true);
    expect(url).toContain("/export/view/site-v1/__export__issues.html");
  });
});

describe("getExportDownloadUrl", () => {
  it("OSS: builds an absolute URL through the host + /api scope", () => {
    setApiBase("/api");
    expect(getExportDownloadUrl("site-v1")).toBe("http://api.test/api/export/download/site-v1");
  });

  it("hosted: includes the project-scoped apiBase prefix", () => {
    setApiBase("/api/projects/p1");
    expect(getExportDownloadUrl("site-v1")).toBe("http://api.test/api/projects/p1/export/download/site-v1");
  });
});
