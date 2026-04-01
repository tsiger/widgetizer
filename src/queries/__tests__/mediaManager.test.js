import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

describe("mediaManager", () => {
  let apiFetch;
  let uploadFormData;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetch } = await import("../../lib/apiFetch"));
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    apiFetch.mockReset();
    uploadFormData.mockReset();
  });

  it("caches successful media fetches per project", async () => {
    const mediaData = { files: [{ id: "1", originalName: "photo.jpg" }] };
    apiFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mediaData),
    });

    const { getProjectMedia } = await import("../mediaManager");

    const first = await getProjectMedia("project-1");
    const second = await getProjectMedia("project-1");

    expect(first).toEqual(mediaData);
    expect(second).toEqual(mediaData);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/api/media/projects/project-1/media");
  });

  it("updates cached media after a successful upload", async () => {
    const existingData = { files: [{ id: "1", originalName: "existing.jpg" }] };
    const uploadedFile = { id: "2", originalName: "new.jpg" };

    apiFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(existingData),
    });
    uploadFormData.mockResolvedValue({
      status: 201,
      data: {
        processedFiles: [uploadedFile],
        rejectedFiles: [],
      },
    });

    const { getProjectMedia, uploadProjectMedia } = await import("../mediaManager");

    await getProjectMedia("project-1");
    const uploadResult = await uploadProjectMedia("project-1", [{ name: "new.jpg" }]);
    const cachedAfterUpload = await getProjectMedia("project-1");

    expect(uploadResult.processedFiles).toEqual([uploadedFile]);
    expect(cachedAfterUpload.files).toEqual([...existingData.files, uploadedFile]);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(uploadFormData).toHaveBeenCalledTimes(1);
  });

  it("returns normalized rejected-file payloads from upload errors", async () => {
    uploadFormData.mockRejectedValue({
      status: 400,
      message: "Upload failed",
      data: {
        processedFiles: [],
        rejectedFiles: [{ originalName: "bad.jpg", reason: "File too large" }],
      },
    });

    const { uploadProjectMedia } = await import("../mediaManager");

    const result = await uploadProjectMedia("project-1", [{ name: "bad.jpg" }]);

    expect(result).toEqual({
      processedFiles: [],
      rejectedFiles: [{ originalName: "bad.jpg", reason: "File too large" }],
      error: "Upload failed",
      status: 400,
    });
  });

  it("invalidates cache after deleting a media file", async () => {
    apiFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [{ id: "1", originalName: "before.jpg" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, message: "Deleted" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [{ id: "2", originalName: "after.jpg" }] }),
      });

    const { deleteProjectMedia, getProjectMedia } = await import("../mediaManager");

    await getProjectMedia("project-1");
    await deleteProjectMedia("project-1", "file-1");
    const refreshed = await getProjectMedia("project-1");

    expect(refreshed.files).toEqual([{ id: "2", originalName: "after.jpg" }]);
    expect(apiFetch).toHaveBeenCalledTimes(3);
  });
});
