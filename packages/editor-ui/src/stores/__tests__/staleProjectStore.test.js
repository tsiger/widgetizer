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

  it("clearProjectMismatch brings back a language warning a project warning covered", () => {
    const s = useStaleProjectStore.getState();
    s.markLanguageRemoved("el");
    s.markStale("Marketing");
    expect(useStaleProjectStore.getState().reason).toBe("project");

    useStaleProjectStore.getState().clearProjectMismatch();

    const after = useStaleProjectStore.getState();
    expect(after.isStale).toBe(true);
    expect(after.reason).toBe("language");
    expect(after.removedLanguage).toBe("el");
    expect(after.incomingName).toBe(null);
  });

  it("clearProjectMismatch brings back a language warning that had no language code", () => {
    const s = useStaleProjectStore.getState();
    s.markLanguageRemoved(null);
    s.markStale("Marketing");
    useStaleProjectStore.getState().clearProjectMismatch();
    expect(useStaleProjectStore.getState().reason).toBe("language");
  });

  it("clearProjectMismatch clears a project warning with no language behind it", () => {
    useStaleProjectStore.getState().markStale("Marketing");
    useStaleProjectStore.getState().clearProjectMismatch();
    expect(useStaleProjectStore.getState().isStale).toBe(false);
    expect(useStaleProjectStore.getState().reason).toBe(null);
  });

  it("clearLanguageRemoved under a project warning keeps the project warning but drops the language", () => {
    const s = useStaleProjectStore.getState();
    s.markLanguageRemoved("el");
    s.markStale("Marketing");
    useStaleProjectStore.getState().clearLanguageRemoved();
    expect(useStaleProjectStore.getState().reason).toBe("project");

    useStaleProjectStore.getState().clearProjectMismatch();
    expect(useStaleProjectStore.getState().isStale).toBe(false);
  });

  it("a language removed while a project warning is up leaves the project warning on screen", () => {
    // A save already in flight when the project switch was noticed can still come
    // back LANGUAGE_REMOVED. The blocking project warning must stay, and the
    // language one must be there once it clears.
    const s = useStaleProjectStore.getState();
    s.markStale("Marketing");
    s.markLanguageRemoved("el");
    expect(useStaleProjectStore.getState().reason).toBe("project");
    expect(useStaleProjectStore.getState().incomingName).toBe("Marketing");

    useStaleProjectStore.getState().clearProjectMismatch();
    expect(useStaleProjectStore.getState().reason).toBe("language");
    expect(useStaleProjectStore.getState().removedLanguage).toBe("el");
  });
});
