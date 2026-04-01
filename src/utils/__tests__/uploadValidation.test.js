import { describe, expect, it } from "vitest";
import { isZipFile, mapDropzoneRejections, validateFileSizes, validateZipFiles } from "../uploadValidation";

function makeFile({ name, size, type }) {
  return { name, size, type };
}

describe("validateFileSizes", () => {
  it("keeps files within the configured limit", () => {
    const files = [makeFile({ name: "photo.jpg", size: 1024, type: "image/jpeg" })];

    const result = validateFileSizes(files, { maxSizeMB: 5 });

    expect(result.valid).toEqual(files);
    expect(result.rejected).toEqual([]);
  });

  it("rejects files over the configured limit", () => {
    const files = [makeFile({ name: "large.jpg", size: 6 * 1024 * 1024, type: "image/jpeg" })];

    const result = validateFileSizes(files, { maxSizeMB: 5 });

    expect(result.valid).toEqual([]);
    expect(result.rejected).toEqual([
      {
        originalName: "large.jpg",
        reason: "File is too large (6.0MB). Maximum allowed size is 5MB.",
      },
    ]);
  });
});

describe("isZipFile", () => {
  it("accepts zip files by extension", () => {
    expect(isZipFile(makeFile({ name: "theme.zip", size: 10, type: "" }))).toBe(true);
  });

  it("accepts zip files by MIME type", () => {
    expect(isZipFile(makeFile({ name: "theme.bin", size: 10, type: "application/x-zip-compressed" }))).toBe(true);
  });

  it("rejects non-zip files", () => {
    expect(isZipFile(makeFile({ name: "theme.png", size: 10, type: "image/png" }))).toBe(false);
  });
});

describe("validateZipFiles", () => {
  it("rejects multiple files when only one is allowed", () => {
    const files = [
      makeFile({ name: "one.zip", size: 1024, type: "application/zip" }),
      makeFile({ name: "two.zip", size: 1024, type: "application/zip" }),
    ];

    const result = validateZipFiles(files, { multiple: false });

    expect(result.valid).toEqual([]);
    expect(result.rejected).toEqual([
      { originalName: "one.zip", reason: "Please upload a single zip file." },
      { originalName: "two.zip", reason: "Please upload a single zip file." },
    ]);
  });

  it("rejects non-zip files and oversized zip files", () => {
    const files = [
      makeFile({ name: "notes.txt", size: 1024, type: "text/plain" }),
      makeFile({ name: "large.zip", size: 6 * 1024 * 1024, type: "application/zip" }),
    ];

    const result = validateZipFiles(files, { maxSizeMB: 5, multiple: true });

    expect(result.valid).toEqual([]);
    expect(result.rejected).toEqual([
      { originalName: "notes.txt", reason: "Only ZIP files are allowed." },
      { originalName: "large.zip", reason: "File is too large (6.0MB). Maximum allowed size is 5MB." },
    ]);
  });

  it("accepts valid zip files", () => {
    const files = [makeFile({ name: "theme.zip", size: 2 * 1024 * 1024, type: "application/zip" })];

    const result = validateZipFiles(files, { maxSizeMB: 5, multiple: false });

    expect(result.valid).toEqual(files);
    expect(result.rejected).toEqual([]);
  });
});

describe("mapDropzoneRejections", () => {
  it("maps file-too-large and invalid-type errors to user-friendly reasons", () => {
    const fileRejections = [
      {
        file: makeFile({ name: "bad.png", size: 2 * 1024 * 1024, type: "image/png" }),
        errors: [{ code: "file-too-large", message: "too large" }, { code: "file-invalid-type", message: "bad type" }],
      },
    ];

    expect(mapDropzoneRejections(fileRejections)).toEqual([
      {
        originalName: "bad.png",
        reason: "File is too large (2.0MB). File type not supported.",
      },
    ]);
  });

  it("maps too-many-files rejections", () => {
    const fileRejections = [
      {
        file: makeFile({ name: "extra.zip", size: 1024, type: "application/zip" }),
        errors: [{ code: "too-many-files", message: "Too many files" }],
      },
    ];

    expect(mapDropzoneRejections(fileRejections)).toEqual([
      {
        originalName: "extra.zip",
        reason: "Please upload only one file.",
      },
    ]);
  });
});
