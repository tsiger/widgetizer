// @vitest-environment jsdom
/**
 * The media library reads the active project's files when it opens and when the
 * project changes, showing its spinner meanwhile; a reload on demand (refreshing
 * usage) reads them fresh. Every file comes with a metadata object.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const getProjectMedia = vi.fn();
const refreshMediaUsage = vi.fn();
const invalidateMediaCache = vi.fn();
const showToast = vi.fn();
vi.mock("../../queries/mediaManager", () => ({
  getProjectMedia: (...args) => getProjectMedia(...args),
  refreshMediaUsage: (...args) => refreshMediaUsage(...args),
  invalidateMediaCache: (...args) => invalidateMediaCache(...args),
}));
vi.mock("../../stores/toastStore", () => ({ default: (selector) => selector({ showToast }) }));

const { default: useMediaState } = await import("../useMediaState.js");
const { default: useProjectStore } = await import("../../stores/projectStore");

const P1 = { id: "p1" };
const P2 = { id: "p2" };
const pic = { id: "i", type: "image/png", filename: "pic.png", originalName: "pic.png" };
const doc = { id: "d", type: "application/pdf", filename: "doc.pdf", originalName: "doc.pdf", metadata: { alt: "", title: "Brochure" } };

let pending;
beforeEach(() => {
  pending = [];
  getProjectMedia.mockReset().mockImplementation(
    (projectId, force) => new Promise((resolve, reject) => pending.push({ projectId, force, resolve, reject })),
  );
  refreshMediaUsage.mockReset().mockResolvedValue({});
  invalidateMediaCache.mockReset();
  showToast.mockReset();
  act(() => useProjectStore.setState({ activeProject: P1 }));
});
afterEach(() => {
  act(() => useProjectStore.setState({ activeProject: null }));
  localStorage.clear();
});

const answerLast = (files) => act(async () => pending[pending.length - 1].resolve({ files }));

describe("useMediaState loading the library", () => {
  it("reads the project's files behind the spinner and gives each a metadata object", async () => {
    const { result } = renderHook(() => useMediaState());
    expect(result.current.loading).toBe(true);
    expect(pending[0]).toMatchObject({ projectId: "p1", force: false });
    await answerLast([pic, doc]);
    expect(result.current.loading).toBe(false);
    expect(result.current.files).toEqual([{ ...pic, metadata: { alt: "", title: "" } }, doc]);
  });

  it("reads the other project's files behind the spinner when the project changes", async () => {
    const { result } = renderHook(() => useMediaState());
    await answerLast([pic]);
    act(() => useProjectStore.setState({ activeProject: P2 }));
    expect(result.current.loading).toBe(true);
    expect(pending[pending.length - 1].projectId).toBe("p2");
    await answerLast([doc]);
    expect(result.current.loading).toBe(false);
    expect(result.current.files).toEqual([doc]);
  });

  it("says so when the files can't be read, and stops the spinner", async () => {
    const { result } = renderHook(() => useMediaState());
    await act(async () => pending[0].reject(new Error("offline")));
    expect(result.current.loading).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Failed to load media files", "error");
  });

  it("reloads fresh on demand, behind the spinner", async () => {
    const { result } = renderHook(() => useMediaState());
    await answerLast([pic]);
    let done;
    act(() => {
      done = result.current.loadMediaFiles(true);
    });
    expect(result.current.loading).toBe(true);
    expect(invalidateMediaCache).toHaveBeenCalledWith("p1");
    expect(pending[pending.length - 1]).toMatchObject({ projectId: "p1", force: true });
    await answerLast([pic, doc]);
    await act(() => done);
    expect(result.current.files).toHaveLength(2);
  });

  it("refreshes usage, then reads the files fresh", async () => {
    const { result } = renderHook(() => useMediaState());
    await answerLast([pic]);
    let done;
    act(() => {
      done = result.current.handleRefreshUsage();
    });
    await act(async () => {});
    expect(refreshMediaUsage).toHaveBeenCalled();
    expect(pending[pending.length - 1].force).toBe(true);
    await answerLast([pic]);
    await act(() => done);
    expect(showToast).toHaveBeenCalledWith("Media usage tracking refreshed", "success");
  });

  it("reads nothing without an active project", () => {
    act(() => useProjectStore.setState({ activeProject: null }));
    getProjectMedia.mockClear();
    const { result } = renderHook(() => useMediaState());
    expect(getProjectMedia).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  it("reads nothing while no project is active, and reads the next project's files behind the spinner", async () => {
    const { result } = renderHook(() => useMediaState());
    await answerLast([pic]);
    act(() => useProjectStore.setState({ activeProject: null }));
    expect(getProjectMedia).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.files).toHaveLength(1);
    act(() => useProjectStore.setState({ activeProject: P2 }));
    expect(result.current.loading).toBe(true);
    expect(pending[pending.length - 1].projectId).toBe("p2");
    await answerLast([doc]);
    expect(result.current.files).toEqual([doc]);
  });
});
