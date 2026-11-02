// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// The metadata drawer's hook: saving through saveMediaMetadata (which owns the
// route and the media cache) and opening files.

vi.mock("../../queries/mediaManager", () => ({
  saveMediaMetadata: vi.fn(),
}));

vi.mock("../../lib/config", () => ({
  API_URL: (path) => path,
}));

import useMediaMetadata from "../useMediaMetadata.js";
import { saveMediaMetadata } from "../../queries/mediaManager";

const ACTIVE_PROJECT = { id: "proj-1" };

afterEach(() => {
  vi.clearAllMocks();
});

describe("useMediaMetadata", () => {
  // The save itself (route, cache invalidation) is saveMediaMetadata's, tested
  // in the query suite; the hook passes the language and keeps the list current.
  it("saves through saveMediaMetadata and updates the file in the list", async () => {
    saveMediaMetadata.mockResolvedValue({ file: { metadata: { alt: "new" }, translations: {} } });
    const setFiles = vi.fn();
    const { result } = renderHook(() =>
      useMediaMetadata({ activeProject: ACTIVE_PROJECT, showToast: vi.fn(), setFiles }),
    );

    await act(async () => {
      await result.current.handleSaveMetadata("file-1", { alt: "new" }, "el");
    });

    expect(saveMediaMetadata).toHaveBeenCalledWith("proj-1", "file-1", { alt: "new" }, "el");
    const [[update]] = setFiles.mock.calls;
    expect(update([{ id: "file-1", metadata: { alt: "old" } }])[0].metadata.alt).toBe("new");
  });

  it("opens a file without a link back to the editor", () => {
    window.open = vi.fn();
    const { result } = renderHook(() =>
      useMediaMetadata({ activeProject: ACTIVE_PROJECT, showToast: vi.fn(), setFiles: vi.fn() }),
    );

    result.current.handleFileView({ id: "file-1" });

    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("/media/file-1"), "_blank", "noopener,noreferrer");
  });
});
