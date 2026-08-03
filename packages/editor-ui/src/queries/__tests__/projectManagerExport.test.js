// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  throwApiError: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

function zipResponse(contentDisposition) {
  return {
    ok: true,
    headers: {
      get: (name) => (name.toLowerCase() === "content-disposition" ? contentDisposition : null),
    },
    blob: async () => new Blob(["zip-bytes"], { type: "application/zip" }),
  };
}

describe("projectManager exportProject", () => {
  let apiFetch;
  let clickSpy;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetch } = await import("../../lib/apiFetch"));
    apiFetch.mockReset();

    // jsdom implements neither object URLs nor anchor-triggered downloads.
    window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Runs the export and returns the filename handed to the download anchor. */
  async function downloadedFilename(contentDisposition) {
    apiFetch.mockResolvedValue(zipResponse(contentDisposition));

    let captured;
    clickSpy.mockImplementation(function captureDownload() {
      captured = this.download;
    });

    const { exportProject } = await import("../projectManager");
    await exportProject("project-1");

    return captured;
  }

  it("strips the surrounding quotes from a quoted filename", async () => {
    // Regression: a greedy match kept the closing quote, and Chromium rewrote that illegal
    // character to `_` when saving on Windows, so backups landed as `<name>.zip_`.
    const filename = await downloadedFilename(
      'attachment; filename="aurum-hellas-export-2026-08-03T08-45-47.zip"',
    );

    expect(filename).toBe("aurum-hellas-export-2026-08-03T08-45-47.zip");
  });

  it("accepts an unquoted filename", async () => {
    expect(await downloadedFilename("attachment; filename=site-export.zip")).toBe("site-export.zip");
  });

  it("ignores parameters that follow the filename", async () => {
    expect(await downloadedFilename('attachment; filename="site-export.zip"; charset=utf-8')).toBe(
      "site-export.zip",
    );
  });

  it("falls back to the default name when the header is missing", async () => {
    expect(await downloadedFilename(null)).toBe("project-export.zip");
  });

  it("revokes the object URL and removes the anchor after the download", async () => {
    await downloadedFilename('attachment; filename="site-export.zip"');

    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
