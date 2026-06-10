import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/apiFetch", () => ({
  apiFetchJson: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

describe("mediaManager", () => {
  let apiFetchJson;
  let uploadFormData;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    apiFetchJson.mockReset();
    uploadFormData.mockReset();
  });

  it("caches successful media fetches per project", async () => {
    const mediaData = { files: [{ id: "1", originalName: "photo.jpg" }] };
    apiFetchJson.mockResolvedValue(mediaData);

    const { getProjectMedia } = await import("../mediaManager");

    const first = await getProjectMedia("project-1");
    const second = await getProjectMedia("project-1");

    expect(first).toEqual(mediaData);
    expect(second).toEqual(mediaData);
    expect(apiFetchJson).toHaveBeenCalledTimes(1);
    expect(apiFetchJson).toHaveBeenCalledWith(
      "/api/media/projects/project-1/media",
      {},
      { fallbackMessage: "Failed to get media files" },
    );
  });

  it("updates cached media after a successful upload", async () => {
    const existingData = { files: [{ id: "1", originalName: "existing.jpg" }] };
    const uploadedFile = { id: "2", originalName: "new.jpg" };

    apiFetchJson.mockResolvedValue(existingData);
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
    expect(apiFetchJson).toHaveBeenCalledTimes(1);
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
    apiFetchJson
      .mockResolvedValueOnce({ files: [{ id: "1", originalName: "before.jpg" }] })
      .mockResolvedValueOnce({ success: true, message: "Deleted" })
      .mockResolvedValueOnce({ files: [{ id: "2", originalName: "after.jpg" }] });

    const { deleteProjectMedia, getProjectMedia } = await import("../mediaManager");

    await getProjectMedia("project-1");
    await deleteProjectMedia("project-1", "file-1");
    const refreshed = await getProjectMedia("project-1");

    expect(refreshed.files).toEqual([{ id: "2", originalName: "after.jpg" }]);
    expect(apiFetchJson).toHaveBeenCalledTimes(3);
  });
});
