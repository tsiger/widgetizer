// @vitest-environment jsdom
/**
 * The active project's collection schemas: one request for every screen that
 * asks at once, kept for a minute per project, read again on demand. Without a
 * project there are none.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const getCollectionSchemas = vi.fn();
vi.mock("../../queries/collectionManager", () => ({ getCollectionSchemas: (...args) => getCollectionSchemas(...args) }));

let useCollections;
let useProjectStore;
let pending;

beforeEach(async () => {
  // The cache is module state; each test starts from a fresh module.
  vi.resetModules();
  ({ default: useCollections } = await import("../useCollections.js"));
  ({ default: useProjectStore } = await import("../../stores/projectStore"));
  pending = [];
  getCollectionSchemas.mockReset().mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
  act(() => useProjectStore.setState({ activeProject: { id: "p1" } }));
});
afterEach(() => vi.useRealTimers());

const NEWS = [{ type: "news" }];
const SERVICES = [{ type: "services" }];
const answerLast = (data) => act(async () => pending[pending.length - 1].resolve(data));
const view = (r) => ({ schemas: r.current.schemas, loading: r.current.loading, error: r.current.error?.message ?? null });

describe("useCollections", () => {
  it("has no schemas and is not loading without a project", async () => {
    act(() => useProjectStore.setState({ activeProject: null }));
    const { result } = renderHook(() => useCollections());
    await act(async () => {});
    expect(view(result)).toEqual({ schemas: [], loading: false, error: null });
    expect(getCollectionSchemas).not.toHaveBeenCalled();
  });

  it("loads the project's schemas", async () => {
    const { result } = renderHook(() => useCollections());
    expect(result.current.loading).toBe(true);
    await answerLast(NEWS);
    expect(view(result)).toEqual({ schemas: NEWS, loading: false, error: null });
  });

  it("makes one request for screens that ask together", async () => {
    const a = renderHook(() => useCollections());
    const b = renderHook(() => useCollections());
    expect(getCollectionSchemas).toHaveBeenCalledTimes(1);
    await answerLast(NEWS);
    expect(a.result.current.schemas).toEqual(NEWS);
    expect(b.result.current.schemas).toEqual(NEWS);
  });

  it("keeps the schemas for a minute, then asks again", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const first = renderHook(() => useCollections());
    await answerLast(NEWS);
    first.unmount();
    const second = renderHook(() => useCollections());
    await act(async () => {});
    expect(view(second.result)).toEqual({ schemas: NEWS, loading: false, error: null });
    expect(getCollectionSchemas).toHaveBeenCalledTimes(1);
    second.unmount();
    vi.setSystemTime(Date.now() + 60001);
    const third = renderHook(() => useCollections());
    expect(getCollectionSchemas).toHaveBeenCalledTimes(2);
    await answerLast(SERVICES);
    expect(third.result.current.schemas).toEqual(SERVICES);
  });

  it("reports a failed read with no schemas", async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => pending[0].reject(new Error("offline")));
    expect(view(result)).toEqual({ schemas: [], loading: false, error: "offline" });
  });

  it("reads again on demand, behind the spinner", async () => {
    const { result } = renderHook(() => useCollections());
    await answerLast(NEWS);
    let done;
    act(() => {
      done = result.current.refetch();
    });
    expect(result.current.loading).toBe(true);
    expect(getCollectionSchemas).toHaveBeenCalledTimes(2);
    await answerLast(SERVICES);
    await act(() => done);
    expect(view(result)).toEqual({ schemas: SERVICES, loading: false, error: null });
  });

  it("loads another project's schemas, and none when the project goes away", async () => {
    const { result } = renderHook(() => useCollections());
    await answerLast(NEWS);
    act(() => useProjectStore.setState({ activeProject: { id: "p2" } }));
    expect(getCollectionSchemas).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(true);
    await answerLast(SERVICES);
    expect(result.current.schemas).toEqual(SERVICES);
    act(() => useProjectStore.setState({ activeProject: null }));
    await act(async () => {});
    expect(view(result)).toEqual({ schemas: [], loading: false, error: null });
  });

  it("shows a cached project's schemas again when switching back to it", async () => {
    const { result } = renderHook(() => useCollections());
    await answerLast(NEWS);
    act(() => useProjectStore.setState({ activeProject: { id: "p2" } }));
    await answerLast(SERVICES);
    act(() => useProjectStore.setState({ activeProject: { id: "p1" } }));
    await act(async () => {});
    expect(view(result)).toEqual({ schemas: NEWS, loading: false, error: null });
    expect(getCollectionSchemas).toHaveBeenCalledTimes(2);
  });
});
