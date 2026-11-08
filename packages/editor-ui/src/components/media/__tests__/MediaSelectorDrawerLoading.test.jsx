// @vitest-environment jsdom
/**
 * The media picker shows a spinner while it reads the library, each time it
 * opens and when the project changes while it is open. A library it can't read
 * when it first opens leaves it empty.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const getProjectMedia = vi.fn();
vi.mock("../../../queries/mediaManager", () => ({ getProjectMedia: (...args) => getProjectMedia(...args) }));
vi.mock("../../../hooks/useMediaUpload", () => ({
  default: () => ({ uploading: false, uploadProgress: {}, handleUpload: vi.fn() }),
}));
vi.mock("../../../hooks/useAppSettings", () => ({ default: () => ({ settings: { media: { maxFileSizeMB: 50 } } }) }));
vi.mock("../../ui/FileUploader", () => ({ default: () => null }));
vi.mock("../../ui/Tooltip", () => ({ default: ({ children }) => children }));
vi.mock("../../ui/LoadingSpinner", () => ({ default: () => <p>spinner</p> }));

const { default: MediaSelectorDrawer } = await import("../MediaSelectorDrawer.jsx");

const file = (name) => ({ id: name, type: "image/png", path: `/uploads/images/${name}`, filename: name });
const P1 = { id: "p1" };
const P2 = { id: "p2" };

let pending;
beforeEach(() => {
  pending = [];
  getProjectMedia.mockReset().mockImplementation((projectId) => new Promise((resolve, reject) => pending.push({ projectId, resolve, reject })));
});
afterEach(cleanup);

const drawer = (props) => <MediaSelectorDrawer onClose={vi.fn()} onSelect={vi.fn()} filterType="image" {...props} />;
const answerLast = (files) => act(async () => pending[pending.length - 1].resolve({ files }));

describe("the media picker while it reads the library", () => {
  it("shows a spinner when it opens, then the library", async () => {
    render(drawer({ visible: true, activeProject: P1 }));
    expect(screen.getByText("spinner")).toBeInTheDocument();
    await answerLast([file("pic.png")]);
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("pic.png")).toBeInTheDocument();
  });

  it("shows nothing and reads nothing while closed", () => {
    render(drawer({ visible: false, activeProject: P1 }));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(getProjectMedia).not.toHaveBeenCalled();
  });

  it("reads the library again, behind the spinner, each time it opens", async () => {
    const { rerender } = render(drawer({ visible: true, activeProject: P1 }));
    await answerLast([file("pic.png")]);
    rerender(drawer({ visible: false, activeProject: P1 }));
    rerender(drawer({ visible: true, activeProject: P1 }));
    expect(screen.getByText("spinner")).toBeInTheDocument();
    expect(getProjectMedia).toHaveBeenCalledTimes(2);
    await answerLast([file("pic.png"), file("new.png")]);
    expect(screen.getByText("new.png")).toBeInTheDocument();
  });

  it("reads the other project's library when the project changes while open", async () => {
    const { rerender } = render(drawer({ visible: true, activeProject: P1 }));
    await answerLast([file("pic.png")]);
    rerender(drawer({ visible: true, activeProject: P2 }));
    expect(screen.getByText("spinner")).toBeInTheDocument();
    expect(pending[pending.length - 1].projectId).toBe("p2");
    await answerLast([file("other.png")]);
    expect(screen.getByText("other.png")).toBeInTheDocument();
  });

  it("stops the spinner and lists nothing when the library can't be read on opening", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(drawer({ visible: true, activeProject: P1 }));
    await act(async () => pending[0].reject(new Error("offline")));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("components.mediaSelector.noFiles")).toBeInTheDocument();
    errors.mockRestore();
  });
});
