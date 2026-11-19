// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../../lib/apiFetch", () => ({
  editorFetchJson: vi.fn(),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    throw new Error(fallbackMessage);
  }),
}));
vi.mock("../../stores/projectStore", () => ({
  default: (selector) => selector({ activeProject: { id: "project-1" } }),
}));

describe("useProjectLimits", () => {
  let editorFetchJson;
  let useProjectLimits;
  let formatLimitMB;

  beforeEach(async () => {
    vi.resetModules();
    ({ editorFetchJson } = await import("../../lib/apiFetch"));
    ({ default: useProjectLimits, formatLimitMB } = await import("../useProjectLimits.js"));
    editorFetchJson.mockReset();
  });

  it("reads the upload limit from GET /limits", async () => {
    editorFetchJson.mockResolvedValue({ maxUploadBytes: 50 * 1024 * 1024 });

    const { result } = renderHook(() => useProjectLimits());
    expect(result.current.maxUploadBytes).toBeNull();

    await waitFor(() => expect(result.current.maxUploadBytes).toBe(50 * 1024 * 1024));
    expect(result.current.maxSizeMB).toBe(50);
    expect(editorFetchJson.mock.calls[0][0]).toBe("/limits");
  });

  it("treats a null limit as no limit", async () => {
    editorFetchJson.mockResolvedValue({ maxUploadBytes: null });

    const { result } = renderHook(() => useProjectLimits());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.maxUploadBytes).toBeNull();
    expect(result.current.maxSizeMB).toBeNull();
  });

  it("checks nothing when the limit cannot be loaded", async () => {
    editorFetchJson.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useProjectLimits());

    await waitFor(() => expect(editorFetchJson).toHaveBeenCalled());
    expect(result.current.maxUploadBytes).toBeNull();
  });

  it("words the limit in megabytes", () => {
    expect(formatLimitMB(50 * 1024 * 1024)).toBe("50MB");
    expect(formatLimitMB(512 * 1024)).toBe("0.5MB");
  });
});
