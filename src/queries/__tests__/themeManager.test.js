import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

describe("themeManager uploadThemeZip", () => {
  let uploadFormData;
  let apiFetchJson;

  beforeEach(async () => {
    vi.resetModules();
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    uploadFormData.mockReset();
    apiFetchJson.mockReset();
  });

  it("normalizes successful theme uploads into processedFiles", async () => {
    const theme = { id: "arch", name: "Arch" };
    const progress = vi.fn();
    uploadFormData.mockResolvedValue({
      status: 201,
      data: {
        message: "Theme uploaded successfully!",
        theme,
      },
    });

    const { uploadThemeZip } = await import("../themeManager");
    const file = { name: "arch.zip" };
    const result = await uploadThemeZip(file, progress);

    expect(uploadFormData).toHaveBeenCalledWith(
      "/api/themes/upload",
      expect.any(FormData),
      { onProgress: progress },
    );
    expect(result).toEqual({
      message: "Theme uploaded successfully!",
      theme,
      processedFiles: [theme],
      rejectedFiles: [],
      error: null,
      status: 201,
    });
  });

  it("preserves status and response data on upload errors", async () => {
    uploadFormData.mockRejectedValue({
      message: "Invalid theme archive",
      status: 400,
      data: { message: "Invalid theme archive" },
    });

    const { uploadThemeZip } = await import("../themeManager");

    await expect(uploadThemeZip({ name: "bad.zip" })).rejects.toMatchObject({
      message: "Invalid theme archive",
      status: 400,
      data: { message: "Invalid theme archive" },
    });
  });
});

describe("themeManager saveThemeSettings", () => {
  let apiFetchJson;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    apiFetchJson.mockReset();
  });

  it("preserves PROJECT_MISMATCH metadata for saveStore guards", async () => {
    const mismatchError = {
      name: "ApiError",
      message: "The active project has changed.",
      code: "PROJECT_MISMATCH",
      status: 409,
      data: { code: "PROJECT_MISMATCH" },
    };
    apiFetchJson.mockRejectedValue(mismatchError);

    const { saveThemeSettings } = await import("../themeManager");

    await expect(saveThemeSettings("project-1", { settings: {} })).rejects.toMatchObject({
      code: "PROJECT_MISMATCH",
      status: 409,
      data: { code: "PROJECT_MISMATCH" },
    });
  });
});
