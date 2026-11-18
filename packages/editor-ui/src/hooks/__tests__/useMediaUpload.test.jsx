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
let mockLimit = 50 * 1024 * 1024;
vi.mock("../useProjectLimits", () => ({
  default: () => ({ maxUploadBytes: mockLimit, maxSizeMB: mockLimit == null ? null : mockLimit / 1024 / 1024, loaded: true }),
}));
let mockFormat = null;
vi.mock("../../extension/PluginProvider", () => ({
  useUploadRefusalFormatter: () =>
    mockFormat
      ? (list) => list.map((r) => (r.code ? { ...r, reason: mockFormat(r) ?? r.reason } : r))
      : (list) => list,
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

function bigFile(name, bytes) {
  const file = new File(["x"], name, { type: "video/mp4" });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

describe("useMediaUpload — client-side size limit", () => {
  let uploadFormData;
  let useMediaUpload;

  beforeEach(async () => {
    vi.resetModules();
    mockLimit = 50 * 1024 * 1024;
    mockFormat = null;
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    ({ default: useMediaUpload } = await import("../useMediaUpload.js"));
    uploadFormData.mockReset();
  });

  const upload = async (files, showToast = vi.fn()) => {
    const { result } = renderHook(() =>
      useMediaUpload({ activeProject: { id: "project-1" }, showToast, setFiles: vi.fn() }),
    );
    await result.current.handleUpload(files);
    return showToast;
  };

  it("rejects a file over the project's upload limit without sending it", async () => {
    const showToast = await upload([bigFile("clip.mp4", 51 * 1024 * 1024)]);

    expect(uploadFormData).not.toHaveBeenCalled();
    expect(showToast.mock.calls.flat().join(" ")).toMatch(/too large/i);
  });

  it("uses the limit from the project's limits, not the media setting", async () => {
    mockLimit = 2 * 1024 * 1024;
    uploadFormData.mockResolvedValue({ status: 201, data: { processedFiles: [], rejectedFiles: [] } });

    const showToast = await upload([bigFile("clip.mp4", 3 * 1024 * 1024)]);

    expect(uploadFormData).not.toHaveBeenCalled();
    expect(showToast.mock.calls.flat().join(" ")).toContain("Maximum allowed size is 2MB");
  });

  it("sends any size when there is no limit", async () => {
    mockLimit = null;
    uploadFormData.mockResolvedValue({ status: 201, data: { processedFiles: [uploaded(1)], rejectedFiles: [] } });

    await upload([bigFile("clip.mp4", 900 * 1024 * 1024)]);

    expect(uploadFormData).toHaveBeenCalledTimes(1);
  });

  it("words a server refusal with the shell's formatter, and keeps the server's reason when it declines", async () => {
    const refusal = {
      originalName: "clip.mp4",
      code: "FILE_TOO_LARGE",
      limitBytes: 1024,
      sizeBytes: 2048,
      reason: "Server wording",
    };
    uploadFormData.mockResolvedValue({ status: 400, data: { processedFiles: [], rejectedFiles: [refusal] } });
    mockFormat = (r) => `Shell wording ${r.code} ${r.limitBytes}`;

    let showToast = await upload([bigFile("clip.mp4", 10)]);
    expect(showToast.mock.calls.flat().join(" ")).toContain("clip.mp4: Shell wording FILE_TOO_LARGE 1024");

    mockFormat = () => null;
    showToast = await upload([bigFile("clip.mp4", 10)]);
    expect(showToast.mock.calls.flat().join(" ")).toContain("clip.mp4: Server wording");
  });

  it("words a client-side too-large refusal with the shell's formatter too", async () => {
    mockFormat = (r) => `Shell wording ${r.limitBytes}`;

    const showToast = await upload([bigFile("clip.mp4", 51 * 1024 * 1024)]);

    expect(uploadFormData).not.toHaveBeenCalled();
    expect(showToast.mock.calls.flat().join(" ")).toContain(`clip.mp4: Shell wording ${50 * 1024 * 1024}`);
  });
});
