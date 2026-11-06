// @vitest-environment jsdom
/**
 * Only the newest export-history load decides what the page shows: an older
 * load that settles late, failed or not, must not overwrite it. Loads come from
 * the page opening, Try again and the refresh after an export.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const getExportHistory = vi.fn();
let projectState;

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../queries/exportManager", () => ({ getExportHistory: (...args) => getExportHistory(...args) }));
vi.mock("../../stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return { default: hook };
});
vi.mock("../../stores/toastStore", () => {
  const state = { showToast: () => {} };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});

const { default: useExportState } = await import("../useExportState.js");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const failure = () => Object.assign(new Error("Failed to get export history"), { code: "UNEXPECTED_REPLY" });
const RECORD = { version: 1, timestamp: "2026-09-15T10:00:00.000Z" };

beforeEach(() => {
  getExportHistory.mockReset();
  projectState = { activeProject: { id: "p1", name: "P" } };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useExportState — overlapping history loads", () => {
  it("a retry that fails late does not undo a newer retry that succeeded", async () => {
    const opening = deferred();
    const firstRetry = deferred();
    const secondRetry = deferred();
    getExportHistory
      .mockReturnValueOnce(opening.promise)
      .mockReturnValueOnce(firstRetry.promise)
      .mockReturnValueOnce(secondRetry.promise);
    const { result } = renderHook(() => useExportState());

    await act(async () => opening.reject(failure()));
    await waitFor(() => expect(result.current.historyFailed).toBe(true));

    act(() => {
      result.current.loadExportHistory("p1");
      result.current.loadExportHistory("p1");
    });
    await act(async () => secondRetry.resolve({ exports: [RECORD] }));
    await act(async () => firstRetry.reject(failure()));

    expect(result.current.historyFailed).toBe(false);
    expect(result.current.exportHistory).toEqual([RECORD]);
    expect(result.current.loadingHistory).toBe(false);
  });

  it("the opening load failing late does not mark a newer refresh out of date", async () => {
    const opening = deferred();
    const refresh = deferred();
    getExportHistory.mockReturnValueOnce(opening.promise).mockReturnValueOnce(refresh.promise);
    const { result } = renderHook(() => useExportState());

    act(() => {
      result.current.loadExportHistory("p1");
    });
    await act(async () => refresh.resolve({ exports: [RECORD] }));
    await act(async () => opening.reject(failure()));

    expect(result.current.historyFailed).toBe(false);
    expect(result.current.exportHistory).toEqual([RECORD]);
  });

  it("keeps loading true until the newest load settles", async () => {
    const opening = deferred();
    const retry = deferred();
    getExportHistory.mockReturnValueOnce(opening.promise).mockReturnValueOnce(retry.promise);
    const { result } = renderHook(() => useExportState());

    act(() => {
      result.current.loadExportHistory("p1");
    });
    await act(async () => opening.resolve({ exports: [] }));
    expect(result.current.loadingHistory).toBe(true);
    await act(async () => retry.resolve({ exports: [RECORD] }));
    expect(result.current.loadingHistory).toBe(false);
  });
});
