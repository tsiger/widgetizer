import { describe, it, expect, vi, beforeEach } from "vitest";

describe("mutationEvents", () => {
  let subscribeMutationSuccess, notifyMutationSuccess;

  beforeEach(async () => {
    vi.resetModules();
    ({ subscribeMutationSuccess, notifyMutationSuccess } = await import("../mutationEvents.js"));
  });

  it("delivers the event to every subscriber", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeMutationSuccess(a);
    subscribeMutationSuccess(b);
    notifyMutationSuccess({ method: "POST", path: "/api/pages" });
    expect(a).toHaveBeenCalledWith({ method: "POST", path: "/api/pages" });
    expect(b).toHaveBeenCalledWith({ method: "POST", path: "/api/pages" });
  });

  it("stops delivering after unsubscribe", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeMutationSuccess(handler);
    unsubscribe();
    notifyMutationSuccess({ method: "DELETE", path: "/api/pages/x" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("a throwing listener does not break delivery to the others", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    subscribeMutationSuccess(bad);
    subscribeMutationSuccess(good);
    notifyMutationSuccess({ method: "PUT", path: "/api/x" });
    expect(good).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
