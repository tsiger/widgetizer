import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/apiFetch", () => ({
  editorFetchJson: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

vi.mock("../../lib/apiBase", () => ({
  getApiBase: vi.fn(() => "/api"),
}));

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

describe("mediaManager", () => {
  let editorFetchJson;
  let uploadFormData;

  beforeEach(async () => {
    vi.resetModules();
    ({ editorFetchJson } = await import("../../lib/apiFetch"));
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    editorFetchJson.mockReset();
    uploadFormData.mockReset();
  });

  it("caches successful media fetches per project", async () => {
    const mediaData = { files: [{ id: "1", originalName: "photo.jpg" }] };
    editorFetchJson.mockResolvedValue(mediaData);

    const { getProjectMedia } = await import("../mediaManager");

    const first = await getProjectMedia("project-1");
    const second = await getProjectMedia("project-1");

    expect(first).toEqual(mediaData);
    expect(second).toEqual(mediaData);
    expect(editorFetchJson).toHaveBeenCalledTimes(1);
    expect(editorFetchJson).toHaveBeenCalledWith(
      "/media",
      {},
      { expect: "object", fallbackMessage: "Failed to get media files" },
    );
  });

  it("puts freshly uploaded files at the top of the cached list (newest first, as the server returns them)", async () => {
    const existingData = { files: [{ id: "1", originalName: "existing.jpg" }] };
    const uploadedFile = { id: "2", originalName: "new.jpg" };

    editorFetchJson.mockResolvedValue(existingData);
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
    expect(cachedAfterUpload.files).toEqual([uploadedFile, ...existingData.files]);
    expect(editorFetchJson).toHaveBeenCalledTimes(1);
    expect(uploadFormData).toHaveBeenCalledTimes(1);
    expect(uploadFormData).toHaveBeenCalledWith("/api/media", expect.anything(), expect.anything());
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
    editorFetchJson
      .mockResolvedValueOnce({ files: [{ id: "1", originalName: "before.jpg" }] })
      .mockResolvedValueOnce({ success: true, message: "Deleted" })
      .mockResolvedValueOnce({ files: [{ id: "2", originalName: "after.jpg" }] });

    const { deleteProjectMedia, getProjectMedia } = await import("../mediaManager");

    await getProjectMedia("project-1");
    await deleteProjectMedia("project-1", "file-1");
    const refreshed = await getProjectMedia("project-1");

    expect(refreshed.files).toEqual([{ id: "2", originalName: "after.jpg" }]);
    expect(editorFetchJson).toHaveBeenCalledTimes(3);
    expect(editorFetchJson).toHaveBeenNthCalledWith(
      2,
      "/media/file-1",
      { method: "DELETE" },
      { fallbackMessage: "Failed to delete file" },
    );
  });

  // The save goes through the editor API base like every other media call, so
  // it reaches the project however the app mounts the project-scoped routes.
  it("saves metadata through the project-relative route, with the language", async () => {
    const saved = { file: { id: "file-1", metadata: { alt: "new" } } };
    editorFetchJson.mockResolvedValue(saved);
    const { saveMediaMetadata } = await import("../mediaManager");

    expect(await saveMediaMetadata("project-1", "file-1", { alt: "new" })).toEqual(saved);
    expect(editorFetchJson).toHaveBeenLastCalledWith(
      "/media/file-1/metadata",
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: "new" }) },
      { fallbackMessage: "Failed to update metadata" },
    );

    await saveMediaMetadata("project-1", "file-1", { alt: "neu" }, "de-AT");
    expect(editorFetchJson.mock.lastCall[0]).toBe("/media/file-1/metadata?language=de-AT");
  });

  it("passes a server refusal on with its status, code and message", async () => {
    const refusal = Object.assign(new Error("The active project has changed. Please reload the page."), {
      name: "ApiError",
      status: 409,
      code: "PROJECT_MISMATCH",
    });
    editorFetchJson.mockRejectedValue(refusal);
    const { saveMediaMetadata } = await import("../mediaManager");

    await expect(saveMediaMetadata("project-1", "file-1", { alt: "new" })).rejects.toBe(refusal);
  });

  it("drops the project's media cache after a metadata save", async () => {
    editorFetchJson.mockResolvedValue({ files: [] });
    const { getProjectMedia, saveMediaMetadata } = await import("../mediaManager");

    await getProjectMedia("project-1");
    await saveMediaMetadata("project-1", "file-1", { alt: "new" });
    await getProjectMedia("project-1");

    expect(editorFetchJson.mock.calls.filter(([path]) => path === "/media")).toHaveLength(2);
  });
});
