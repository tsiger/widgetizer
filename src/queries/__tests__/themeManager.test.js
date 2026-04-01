import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

describe("themeManager uploadThemeZip", () => {
  let uploadFormData;

  beforeEach(async () => {
    vi.resetModules();
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    uploadFormData.mockReset();
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
