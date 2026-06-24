// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Finding D4: after a successful metadata save the hook must drop the shared 30s
// media cache (invalidateMediaCache) so the page editor's image inputs re-fetch
// fresh metadata instead of serving stale cached data. The package port kept the
// local setFiles update but lost the cache-invalidation call.

vi.mock("../../queries/mediaManager", () => ({
  invalidateMediaCache: vi.fn(),
}));

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../../lib/config", () => ({
  API_URL: (path) => path,
}));

import useMediaMetadata from "../useMediaMetadata.js";
import { invalidateMediaCache } from "../../queries/mediaManager";
import { apiFetch } from "../../lib/apiFetch";

const ACTIVE_PROJECT = { id: "proj-1" };

afterEach(() => {
  vi.clearAllMocks();
});

describe("useMediaMetadata", () => {
  it("invalidates the shared media cache after a successful metadata save", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ file: { metadata: { alt: "new" } } }),
    });

    const { result } = renderHook(() =>
      useMediaMetadata({ activeProject: ACTIVE_PROJECT, showToast: vi.fn(), setFiles: vi.fn() }),
    );

    await act(async () => {
      await result.current.handleSaveMetadata("file-1", { alt: "new" });
    });

    expect(invalidateMediaCache).toHaveBeenCalledWith("proj-1");
  });
});
