import { describe, expect, it, vi } from "vitest";
import { showRejectedFiles, showUploadOutcome } from "../uploadFeedback";

describe("showRejectedFiles", () => {
  it("shows an optional summary plus per-file errors", () => {
    const showToast = vi.fn();

    showRejectedFiles(
      showToast,
      [
        { originalName: "bad.zip", reason: "Invalid archive" },
        { originalName: "huge.zip", reason: "File too large" },
      ],
      { summaryMessage: "Upload failed." },
    );

    expect(showToast).toHaveBeenCalledTimes(3);
    expect(showToast).toHaveBeenNthCalledWith(1, "Upload failed.", "error", expect.objectContaining({ duration: 5000 }));
    expect(showToast).toHaveBeenNthCalledWith(
      2,
      "bad.zip: Invalid archive",
      "error",
      expect.objectContaining({ duration: 7000 }),
    );
    expect(showToast).toHaveBeenNthCalledWith(
      3,
      "huge.zip: File too large",
      "error",
      expect.objectContaining({ duration: 7000 }),
    );
  });

  it("shows an overflow toast when more than maxDetails files are rejected", () => {
    const showToast = vi.fn();
    const rejected = Array.from({ length: 7 }, (_, index) => ({
      originalName: `file-${index}.zip`,
      reason: "Rejected",
    }));

    showRejectedFiles(showToast, rejected);

    expect(showToast).toHaveBeenCalledTimes(6);
    expect(showToast).toHaveBeenLastCalledWith(
      "... and 2 more files were rejected.",
      "error",
      expect.objectContaining({ duration: 5000 }),
    );
  });
});

describe("showUploadOutcome", () => {
  it("shows a success toast for fully successful uploads", () => {
    const showToast = vi.fn();

    showUploadOutcome(showToast, { processedFiles: [{ id: "1" }], message: "Uploaded." });

    expect(showToast).toHaveBeenCalledWith("Uploaded.", "success");
  });

  it("shows file rejection details for partial success", () => {
    const showToast = vi.fn();

    showUploadOutcome(
      showToast,
      {
        processedFiles: [{ id: "1" }],
        rejectedFiles: [{ originalName: "bad.zip", reason: "Invalid archive" }],
      },
      { partialMessage: "Uploaded 1 file. 1 rejected." },
    );

    expect(showToast).toHaveBeenCalledWith(
      "Uploaded 1 file. 1 rejected.",
      "warning",
      expect.objectContaining({ duration: 5000 }),
    );
    expect(showToast).toHaveBeenCalledWith(
      "bad.zip: Invalid archive",
      "error",
      expect.objectContaining({ duration: 7000 }),
    );
  });

  it("shows a network error toast when the request fails before file results exist", () => {
    const showToast = vi.fn();

    showUploadOutcome(showToast, { error: "Network failed" });

    expect(showToast).toHaveBeenCalledWith("Network failed", "error");
  });
});
