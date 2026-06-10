import { describe, it, expect } from "vitest";
import { SLOT_NAMES, resolveSlot } from "../slots.js";

describe("slots", () => {
  it("defines the MVP slot names", () => {
    expect([...SLOT_NAMES]).toEqual([
      "sidebarHeader",
      "sidebarFooter",
      "topbarLeft",
      "topbarRight",
      "publishConfirmation",
    ]);
  });

  it("resolveSlot returns the node when present (including falsy nodes)", () => {
    const node = { type: "div" };
    expect(resolveSlot({ topbarRight: node }, "topbarRight")).toBe(node);
    expect(resolveSlot({ topbarRight: null }, "topbarRight")).toBe(null);
  });

  it("resolveSlot returns null when the slot is unset or slots is nullish", () => {
    expect(resolveSlot({}, "topbarRight")).toBe(null);
    expect(resolveSlot(undefined, "topbarRight")).toBe(null);
    expect(resolveSlot(null, "sidebarHeader")).toBe(null);
  });
});
