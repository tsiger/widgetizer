// @vitest-environment jsdom
/**
 * What each picker type lists and lets you upload. Video is a view over the
 * `file` category, so Files keeps showing MP4s while image pickers never do.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const LIBRARY = [
  { id: "i", type: "image/png", path: "/uploads/images/pic.png", filename: "pic.png" },
  { id: "p", type: "application/pdf", path: "/uploads/files/brochure.pdf", filename: "brochure.pdf" },
  { id: "a", type: "audio/mpeg", path: "/uploads/files/song.mp3", filename: "song.mp3" },
  { id: "v", type: "video/mp4", path: "/uploads/files/tour.mp4", filename: "tour.mp4" },
];
let uploaderProps;

vi.mock("../../../queries/mediaManager", () => ({ getProjectMedia: async () => ({ files: LIBRARY }) }));
vi.mock("../../../hooks/useMediaUpload", () => ({
  default: () => ({ uploading: false, uploadProgress: {}, handleUpload: vi.fn() }),
}));
vi.mock("../../../hooks/useAppSettings", () => ({ default: () => ({ settings: { media: { maxFileSizeMB: 50 } } }) }));
vi.mock("../../ui/FileUploader", () => ({
  default: (props) => {
    uploaderProps = props;
    return null;
  },
}));
vi.mock("../../ui/Tooltip", () => ({ default: ({ children }) => children }));

const { default: MediaSelectorDrawer } = await import("../MediaSelectorDrawer.jsx");

afterEach(cleanup);

async function listed(filterType) {
  render(
    <MediaSelectorDrawer visible onClose={vi.fn()} onSelect={vi.fn()} activeProject={{ id: "p1" }} filterType={filterType} />,
  );
  await screen.findAllByText(/\.(png|pdf|mp3|mp4)$/);
  return LIBRARY.map((file) => file.filename).filter((name) => screen.queryByText(name));
}

describe("MediaSelectorDrawer type filters", () => {
  it("video lists and uploads MP4 only", async () => {
    expect(await listed("video")).toEqual(["tour.mp4"]);
    expect(uploaderProps.accept).toEqual({ "video/mp4": [".mp4"] });
    expect(uploaderProps.maxSizeText).toContain("components.mediaUploader.supportedVideo");
  });

  it("file lists every non-image, MP4 included", async () => {
    expect(await listed("file")).toEqual(["brochure.pdf", "song.mp3", "tour.mp4"]);
    expect(Object.values(uploaderProps.accept).flat()).toEqual(expect.arrayContaining([".pdf", ".mp3", ".mp4"]));
  });

  it("image never lists an MP4", async () => {
    expect(await listed("image")).toEqual(["pic.png"]);
    expect(Object.values(uploaderProps.accept).flat()).not.toContain(".mp4");
  });
});
