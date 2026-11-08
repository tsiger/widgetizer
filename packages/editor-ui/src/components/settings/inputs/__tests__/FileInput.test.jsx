// @vitest-environment jsdom
/**
 * The file picker in its two modes. A `video` setting must only ever hold an
 * MP4 upload path, whichever way the value arrives: chosen in the library,
 * uploaded through the input, or handed straight to the selection callback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const PDF = { id: "p", type: "application/pdf", path: "/uploads/files/brochure.pdf", filename: "brochure.pdf" };
const MP3 = { id: "a", type: "audio/mpeg", path: "/uploads/files/song.mp3", filename: "song.mp3" };
const IMAGE = { id: "i", type: "image/png", path: "/uploads/images/pic.png", filename: "pic.png" };
const MP4 = { id: "v", type: "video/mp4", path: "/uploads/files/tour.mp4", filename: "tour.mp4" };
const OTHER_MP4 = { id: "v2", type: "video/mp4", path: "/uploads/files/a-tour.mp4", filename: "a-tour.mp4" };
const LIBRARY = [PDF, MP3, IMAGE, MP4, OTHER_MP4];

const getProjectMedia = vi.fn();
const uploadProjectMedia = vi.fn();
const showToast = vi.fn();
let drawerProps;

vi.mock("../../../../queries/mediaManager", () => ({
  getProjectMedia: (...args) => getProjectMedia(...args),
  uploadProjectMedia: (...args) => uploadProjectMedia(...args),
}));
vi.mock("../../../../stores/projectStore", () => ({
  default: (selector) => selector({ activeProject: { id: "p1" } }),
}));
vi.mock("../../../../stores/toastStore", () => ({
  default: (selector) => selector({ showToast }),
}));
vi.mock("../../../../hooks/useAppSettings", () => ({
  default: () => ({ settings: { media: { maxFileSizeMB: 1 } } }),
}));
vi.mock("../../../../components/media/MediaSelectorDrawer", () => ({
  default: (props) => {
    drawerProps = props;
    return (
      <div>
        {LIBRARY.map((file) => (
          <button key={file.id} type="button" onClick={() => props.onSelect(file)}>
            pick {file.filename}
          </button>
        ))}
      </div>
    );
  },
}));

const { default: FileInput } = await import("../FileInput.jsx");

beforeEach(() => {
  getProjectMedia.mockReset().mockResolvedValue({ files: LIBRARY });
  uploadProjectMedia.mockReset();
  showToast.mockReset();
  drawerProps = undefined;
});
afterEach(cleanup);

function renderInput(props) {
  const onChange = vi.fn();
  const view = render(<FileInput id="f" value="" onChange={onChange} {...props} />);
  return { onChange, ...view };
}

function openLibraryAndPick(filename) {
  fireEvent.click(screen.getByText("components.fileInput.browseLibrary"));
  fireEvent.click(screen.getByText(`pick ${filename}`));
}

function chooseLocalFile(container, file) {
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
}

describe("FileInput in video mode", () => {
  it("opens the library on videos and offers only MP4 uploads", () => {
    const { container } = renderInput({ filterType: "video" });
    expect(container.querySelector('input[type="file"]').getAttribute("accept")).toBe(".mp4");
    expect(screen.getByText("components.fileInput.importNewVideo")).toBeTruthy();
    expect(screen.getByText("components.fileInput.videoFormats")).toBeTruthy();

    fireEvent.click(screen.getByText("components.fileInput.browseLibrary"));
    expect(drawerProps.filterType).toBe("video");
  });

  it("stores the upload path of a chosen MP4", () => {
    const { onChange } = renderInput({ filterType: "video" });
    openLibraryAndPick("tour.mp4");
    expect(onChange).toHaveBeenCalledWith("/uploads/files/tour.mp4");
  });

  it("refuses PDF, MP3 and image selections", () => {
    const { onChange } = renderInput({ filterType: "video" });
    for (const name of ["brochure.pdf", "song.mp3", "pic.png"]) openLibraryAndPick(name);
    expect(onChange).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(3);
    expect(showToast).toHaveBeenCalledWith("components.fileInput.selectVideoOnly", "error");
  });

  it("shows a saved video by its exact path after a reload, then replaces and removes it", async () => {
    const onChange = vi.fn();
    render(<FileInput id="f" value="/uploads/files/a-tour.mp4" onChange={onChange} filterType="video" />);

    expect(await screen.findByText("a-tour.mp4")).toBeTruthy();
    expect(screen.queryByText("tour.mp4")).toBeNull();

    openLibraryAndPick("tour.mp4");
    expect(onChange).toHaveBeenLastCalledWith("/uploads/files/tour.mp4");

    fireEvent.click(screen.getByTitle("components.fileInput.remove"));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("uploads an MP4 and stores its path", async () => {
    uploadProjectMedia.mockResolvedValue({ processedFiles: [{ ...MP4, path: "/uploads/files/new-tour.mp4" }], rejectedFiles: [] });
    const { container, onChange } = renderInput({ filterType: "video" });

    chooseLocalFile(container, new File(["x"], "New Tour.MP4", { type: "video/mp4" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("/uploads/files/new-tour.mp4"));
    expect(uploadProjectMedia).toHaveBeenCalledTimes(1);
  });

  it("rejects another file type or an oversized MP4 before any request", () => {
    const { container, onChange } = renderInput({ filterType: "video" });

    chooseLocalFile(container, new File(["x"], "brochure.pdf", { type: "application/pdf" }));
    const big = new File(["x"], "big.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 2 * 1024 * 1024 });
    chooseLocalFile(container, big);

    expect(uploadProjectMedia).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(2);
  });
});

describe("FileInput in its default file mode", () => {
  it("keeps accepting any non-image file, MP4 included", () => {
    const { container, onChange } = renderInput();
    expect(container.querySelector('input[type="file"]').getAttribute("accept")).toBe(".pdf,.mp3,.mp4");

    for (const name of ["brochure.pdf", "song.mp3", "tour.mp4"]) openLibraryAndPick(name);
    expect(drawerProps.filterType).toBe("file");
    expect(onChange.mock.calls.map(([path]) => path)).toEqual([PDF.path, MP3.path, MP4.path]);
  });

  it("still refuses an image", () => {
    const { onChange } = renderInput();
    openLibraryAndPick("pic.png");
    expect(onChange).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("components.fileInput.selectFileOnly", "error");
  });
});

describe("FileInput — a stored file is always shown", () => {
  it("shows a file the library has by its library name, with no note", async () => {
    getProjectMedia.mockReset().mockResolvedValue({ files: [{ ...MP3, filename: "Song (master).mp3" }] });
    render(<FileInput id="f" value="/uploads/files/song.mp3" onChange={vi.fn()} />);
    expect(await screen.findByText("Song (master).mp3")).toBeTruthy();
    expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull();
    expect(screen.queryByText("components.fileInput.detailsFailed")).toBeNull();
  });

  it("shows a stored file the library doesn't have, says so, and still lets it be removed", async () => {
    const onChange = vi.fn();
    render(<FileInput id="f" value="/uploads/files/missing-track.mp3" onChange={onChange} />);

    expect(await screen.findByText("components.fileInput.notInLibrary")).toBeTruthy();
    expect(screen.getByText("missing-track.mp3")).toBeTruthy();
    expect(screen.queryByText("components.fileInput.importNew")).toBeNull();
    fireEvent.click(screen.getByTitle("components.fileInput.remove"));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("shows the stored file when the library can't be read, and Try again asks the server again", async () => {
    getProjectMedia
      .mockReset()
      .mockRejectedValueOnce(Object.assign(new Error("Failed to get media files"), { code: "UNEXPECTED_REPLY" }))
      .mockResolvedValue({ files: LIBRARY });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<FileInput id="f" value="/uploads/files/song.mp3" onChange={vi.fn()} />);

    expect(await screen.findByText("components.fileInput.detailsFailed")).toBeTruthy();
    expect(screen.getByText("song.mp3")).toBeTruthy();
    expect(screen.queryByText("components.fileInput.importNew")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "components.fileInput.retry" }));
    await waitFor(() => expect(screen.queryByText("components.fileInput.detailsFailed")).toBeNull());
    expect(getProjectMedia).toHaveBeenLastCalledWith("p1", true);
    expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull();
  });

  it("offers an upload when nothing is stored", () => {
    render(<FileInput id="f" value="" onChange={vi.fn()} />);
    expect(screen.getByText("components.fileInput.importNew")).toBeTruthy();
  });

  it("asks the server again before calling a file missing, so a list read before an upload doesn't hide it", async () => {
    // The first read is the cached list from before the upload; the fresh one has the file.
    getProjectMedia.mockReset().mockResolvedValueOnce({ files: [PDF] }).mockResolvedValueOnce({ files: [PDF, MP3] });
    render(<FileInput id="f" value="/uploads/files/song.mp3" onChange={vi.fn()} />);

    await waitFor(() => expect(getProjectMedia).toHaveBeenCalledTimes(2));
    expect(getProjectMedia).toHaveBeenLastCalledWith("p1", true);
    await waitFor(() => expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull());
    expect(screen.getByText("song.mp3")).toBeTruthy();
  });

  it("drops the previous file's note as soon as another file is chosen", async () => {
    let resolveSecond;
    getProjectMedia
      .mockReset()
      .mockResolvedValueOnce({ files: LIBRARY })
      .mockResolvedValueOnce({ files: LIBRARY })
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));
    const { rerender } = render(<FileInput id="f" value="/uploads/files/missing-track.mp3" onChange={vi.fn()} />);
    expect(await screen.findByText("components.fileInput.notInLibrary")).toBeTruthy();

    rerender(<FileInput id="f" value="/uploads/files/brochure.pdf" onChange={vi.fn()} />);
    expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull();
    expect(screen.getByText("brochure.pdf")).toBeTruthy();
    resolveSecond({ files: LIBRARY });
    await waitFor(() => expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull());
  });

  it("looks a file up afresh when it comes back, without its earlier note", async () => {
    // Going to another file and back (undo, another block) mustn't bring back
    // what was said about the file before; the new lookup decides.
    const pending = [];
    const later = () => new Promise((resolve) => pending.push(resolve));
    getProjectMedia
      .mockReset()
      .mockResolvedValueOnce({ files: LIBRARY })
      .mockResolvedValueOnce({ files: LIBRARY })
      .mockImplementation(later);
    const missing = <FileInput id="f" value="/uploads/files/missing-track.mp3" onChange={vi.fn()} />;
    const { rerender } = render(missing);
    expect(await screen.findByText("components.fileInput.notInLibrary")).toBeTruthy();

    rerender(<FileInput id="f" value="/uploads/files/brochure.pdf" onChange={vi.fn()} />);
    rerender(missing);
    expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull();
    expect(screen.getByText("missing-track.mp3")).toBeTruthy();

    rerender(<FileInput id="f" value="" onChange={vi.fn()} />);
    rerender(missing);
    expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull();

    // The latest lookup still finds the file missing, and says so.
    await act(async () => pending.splice(0).forEach((resolve) => resolve({ files: LIBRARY })));
    await act(async () => pending.splice(0).forEach((resolve) => resolve({ files: LIBRARY })));
    expect(screen.getByText("components.fileInput.notInLibrary")).toBeTruthy();
  });

  it("drops the failure note while Try again is loading", async () => {
    let resolveRetry;
    getProjectMedia
      .mockReset()
      .mockRejectedValueOnce(new Error("Failed to get media files"))
      .mockReturnValueOnce(new Promise((resolve) => (resolveRetry = resolve)));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<FileInput id="f" value="/uploads/files/song.mp3" onChange={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "components.fileInput.retry" }));
    expect(screen.queryByText("components.fileInput.detailsFailed")).toBeNull();
    expect(screen.getByText("song.mp3")).toBeTruthy();
    resolveRetry({ files: LIBRARY });
    await waitFor(() => expect(getProjectMedia).toHaveBeenCalledTimes(2));
  });

  it("still checks again before calling a later file missing, after an earlier Try again", async () => {
    getProjectMedia
      .mockReset()
      .mockRejectedValueOnce(new Error("Failed to get media files"))
      .mockRejectedValueOnce(new Error("Failed to get media files"))
      // The later file: a list from before its upload, then a fresh one with it.
      .mockResolvedValueOnce({ files: [PDF] })
      .mockResolvedValueOnce({ files: [PDF, MP3] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(<FileInput id="f" value="/uploads/files/brochure.pdf" onChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "components.fileInput.retry" }));
    await screen.findByRole("button", { name: "components.fileInput.retry" });

    rerender(<FileInput id="f" value="/uploads/files/song.mp3" onChange={vi.fn()} />);
    await waitFor(() => expect(getProjectMedia).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(screen.queryByText("components.fileInput.notInLibrary")).toBeNull());
    expect(screen.queryByText("components.fileInput.detailsFailed")).toBeNull();
  });
});
