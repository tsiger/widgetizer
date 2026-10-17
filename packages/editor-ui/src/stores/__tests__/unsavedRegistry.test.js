import { describe, it, expect } from "vitest";
import { registerUnsaved, hasUnsavedWork } from "../unsavedRegistry";

describe("unsaved registry", () => {
  it("reports unsaved work while any registered check says so, and forgets removed checks", () => {
    let dirty = false;
    const remove = registerUnsaved(() => dirty);
    expect(hasUnsavedWork()).toBe(false);
    dirty = true;
    expect(hasUnsavedWork()).toBe(true);
    remove();
    expect(hasUnsavedWork()).toBe(false);
  });
});
