import { describe, it, expect, beforeEach } from "vitest";
import useStaleProjectStore from "../staleProjectStore.js";

beforeEach(() => useStaleProjectStore.getState().clearStale());

describe("staleProjectStore", () => {
  it("defaults to not-stale", () => {
    const s = useStaleProjectStore.getState();
    expect(s.isStale).toBe(false);
    expect(s.incomingName).toBe(null);
  });

  it("markStale sets the flag and the incoming name", () => {
    useStaleProjectStore.getState().markStale("Marketing Site");
    expect(useStaleProjectStore.getState().isStale).toBe(true);
    expect(useStaleProjectStore.getState().incomingName).toBe("Marketing Site");
  });

  it("markStale defaults the name to null", () => {
    useStaleProjectStore.getState().markStale();
    expect(useStaleProjectStore.getState().incomingName).toBe(null);
  });

  it("clearStale resets", () => {
    useStaleProjectStore.getState().markStale("X");
    useStaleProjectStore.getState().clearStale();
    expect(useStaleProjectStore.getState().isStale).toBe(false);
    expect(useStaleProjectStore.getState().incomingName).toBe(null);
  });
});
