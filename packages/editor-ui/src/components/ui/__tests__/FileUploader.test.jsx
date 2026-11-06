// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import FileUploader from "../FileUploader";

const ZIP_ACCEPT = { "application/zip": [".zip"] };

function zip(name) {
  return new File(["PK"], name, { type: "application/zip" });
}

function drop(container, files) {
  const root = container.querySelector("input[type=file]").parentElement;
  fireEvent.drop(root, {
    dataTransfer: {
      files,
      items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })),
      types: ["Files"],
    },
  });
}

describe("FileUploader", () => {
  it("refuses a whole drop that holds more files than a single-file uploader takes", async () => {
    const onUpload = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <FileUploader onUpload={onUpload} onReject={onReject} accept={ZIP_ACCEPT} multiple={false} />,
    );

    drop(container, [zip("a.zip"), zip("b.zip")]);

    await waitFor(() => expect(onReject).toHaveBeenCalledTimes(1));
    expect(onUpload).not.toHaveBeenCalled();
    const rejected = onReject.mock.calls[0][0];
    expect(rejected.map(({ file }) => file.name)).toEqual(["a.zip", "b.zip"]);
    for (const { errors } of rejected) expect(errors.map((error) => error.code)).toContain("too-many-files");
  });

  it("uploads the accepted files and reports the rest when a multi-file drop mixes types", async () => {
    const onUpload = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <FileUploader onUpload={onUpload} onReject={onReject} accept={ZIP_ACCEPT} multiple={true} />,
    );

    drop(container, [zip("a.zip"), new File(["x"], "notes.txt", { type: "text/plain" })]);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(onUpload.mock.calls[0][0].map((file) => file.name)).toEqual(["a.zip"]);
    await waitFor(() => expect(onReject).toHaveBeenCalledTimes(1));
    expect(onReject.mock.calls[0][0].map(({ file }) => file.name)).toEqual(["notes.txt"]);
  });

  it("uploads a single file dropped on a single-file uploader", async () => {
    const onUpload = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <FileUploader onUpload={onUpload} onReject={onReject} accept={ZIP_ACCEPT} multiple={false} />,
    );

    drop(container, [zip("a.zip")]);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(onReject).not.toHaveBeenCalled();
  });
});
