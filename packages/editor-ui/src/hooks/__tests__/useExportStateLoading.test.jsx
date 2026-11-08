// @vitest-environment jsdom
/**
 * The export screen's history while it loads: nothing to load without a
 * project, and everything about the last export cleared; the spinner until the
 * history arrives; another project loads its own history behind the spinner.
 */
import { StrictMode } from "react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

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

const RECORD = { version: 1, timestamp: "2026-09-15T10:00:00.000Z" };

beforeEach(() => {
  getExportHistory.mockReset();
  projectState = { activeProject: { id: "p1", name: "P" } };
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());


const view = (r) => ({
  history: r.current.exportHistory,
  loading: r.current.loadingHistory,
  failed: r.current.historyFailed,
  lastExport: r.current.lastExport,
  summary: r.current.structuredDataSummary,
  skipped: r.current.skippedLanguages,
});

describe("useExportState while the history loads", () => {
  it("has nothing to load without a project", async () => {
    projectState = { activeProject: null };
    const { result } = renderHook(() => useExportState());
    await act(async () => {});
    expect(view(result)).toEqual({ history: [], loading: false, failed: false, lastExport: null, summary: null, skipped: [] });
    expect(getExportHistory).not.toHaveBeenCalled();
  });

  it("keeps loading until the history arrives", async () => {
    const d = deferred();
    getExportHistory.mockReturnValue(d.promise);
    const { result } = renderHook(() => useExportState());
    expect(result.current.loadingHistory).toBe(true);
    await act(async () => d.resolve({ exports: [RECORD], maxVersionsToKeep: 5, developerMode: true }));
    expect(view(result)).toMatchObject({ history: [RECORD], loading: false, failed: false });
    expect(result.current.maxVersionsToKeep).toBe(5);
    expect(result.current.developerMode).toBe(true);
  });

  it("loads another project's history behind the spinner", async () => {
    const first = deferred();
    const second = deferred();
    getExportHistory.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(() => useExportState());
    await act(async () => first.resolve({ exports: [RECORD] }));
    projectState = { activeProject: { id: "p2", name: "Q" } };
    rerender();
    expect(result.current.loadingHistory).toBe(true);
    expect(getExportHistory).toHaveBeenLastCalledWith("p2");
    await act(async () => second.resolve({ exports: [] }));
    expect(view(result)).toMatchObject({ history: [], loading: false });
  });

  it("clears everything about the last export when the project goes away", async () => {
    getExportHistory.mockResolvedValue({ exports: [RECORD] });
    const { result, rerender } = renderHook(() => useExportState());
    await act(async () => {});
    act(() => {
      result.current.setLastExport({ version: 1 });
      result.current.setStructuredDataSummary({ pages: 3 });
      result.current.setSkippedLanguages(["el"]);
    });
    projectState = { activeProject: null };
    rerender();
    await act(async () => {});
    expect(view(result)).toEqual({ history: [], loading: false, failed: false, lastExport: null, summary: null, skipped: [] });
  });

  it("loads the same way under StrictMode", async () => {
    const replies = [];
    getExportHistory.mockImplementation(() => {
      const d = deferred();
      replies.push(d);
      return d.promise;
    });
    const { result } = renderHook(() => useExportState(), { wrapper: StrictMode });
    expect(result.current.loadingHistory).toBe(true);
    // StrictMode runs the load twice; only the second, still-current one may answer.
    await act(async () => replies.forEach((d, i) => d.resolve({ exports: i === replies.length - 1 ? [RECORD] : [] })));
    expect(view(result)).toMatchObject({ history: [RECORD], loading: false });
  });
});
