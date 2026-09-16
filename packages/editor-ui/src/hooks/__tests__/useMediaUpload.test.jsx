// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("../../lib/apiFetch", () => ({
  editorFetchJson: vi.fn(),
  isApiError: vi.fn(() => false),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    throw new Error(fallbackMessage);
  }),
}));
vi.mock("../../lib/apiBase", () => ({ getApiBase: vi.fn(() => "/api") }));
vi.mock("../../lib/uploadRequest", () => ({ uploadFormData: vi.fn() }));
vi.mock("../useAppSettings", () => ({
  default: () => ({ settings: { media: { maxFileSizeMB: 50 } } }),
}));

const EXISTING = { id: "existing", originalName: "existing.png" };
const uploaded = (n) => ({ id: `u${n}`, originalName: `file-${n}.png` });

// The hook uploads in chunks of 5, so six files take two requests.
const SIX = Array.from({ length: 6 }, (_, i) => new File(["x"], `file-${i + 1}.png`, { type: "image/png" }));

describe("useMediaUpload — order of freshly uploaded files", () => {
  let editorFetchJson;
  let uploadFormData;
  let useMediaUpload;
  let getProjectMedia;

  beforeEach(async () => {
    vi.resetModules();
    ({ editorFetchJson } = await import("../../lib/apiFetch"));
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    ({ default: useMediaUpload } = await import("../useMediaUpload.js"));
    ({ getProjectMedia } = await import("../../queries/mediaManager.js"));
    editorFetchJson.mockReset();
    uploadFormData.mockReset();
  });

  it("gives the page and the cache the same newest-first order across chunks", async () => {
    editorFetchJson.mockResolvedValue({ files: [EXISTING] });
    uploadFormData
      .mockResolvedValueOnce({ status: 201, data: { processedFiles: [1, 2, 3, 4, 5].map(uploaded), rejectedFiles: [] } })
      .mockResolvedValueOnce({ status: 201, data: { processedFiles: [uploaded(6)], rejectedFiles: [] } });

    // Seed the shared cache the way the Media page does on load.
    await getProjectMedia("project-1");

    let files = [EXISTING];
    const setFiles = (updater) => {
      files = typeof updater === "function" ? updater(files) : updater;
    };

    const { result } = renderHook(() =>
      useMediaUpload({ activeProject: { id: "project-1" }, showToast: vi.fn(), setFiles }),
    );

    await result.current.handleUpload(SIX);

    expect(uploadFormData).toHaveBeenCalledTimes(2);

    const cached = await getProjectMedia("project-1");
    const ids = (list) => list.map((file) => file.id);

    expect(ids(files)).toEqual(ids(cached.files));
    expect(ids(files)).toEqual(["u6", "u1", "u2", "u3", "u4", "u5", "existing"]);
  });
});
