import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

describe("projectManager importProject", () => {
  let uploadFormData;

  beforeEach(async () => {
    vi.resetModules();
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    uploadFormData.mockReset();
  });

  it("normalizes successful project imports into processedFiles", async () => {
    const project = { id: "project-1", name: "Imported Project" };
    const progress = vi.fn();
    uploadFormData.mockResolvedValue({
      status: 201,
      data: project,
    });

    const { importProject } = await import("../projectManager");
    const result = await importProject({ name: "project.zip" }, progress);

    expect(uploadFormData).toHaveBeenCalledWith(
      "/api/projects/import",
      expect.any(FormData),
      { onProgress: progress },
    );
    expect(result).toEqual({
      ...project,
      processedFiles: [project],
      rejectedFiles: [],
      error: null,
      status: 201,
    });
  });

  it("preserves error metadata for handled import failures", async () => {
    uploadFormData.mockRejectedValue({
      message: "Invalid project export",
      status: 400,
      data: { error: "Invalid project export" },
    });

    const { importProject } = await import("../projectManager");

    await expect(importProject({ name: "bad-project.zip" })).rejects.toMatchObject({
      message: "Invalid project export",
      status: 400,
      data: { error: "Invalid project export" },
    });
  });
});
