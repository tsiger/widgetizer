import { describe, it, expect } from "vitest";
import { SLOT_NAMES } from "@widgetizer/editor-ui";

// Sprint 1.5a wiring smoke test: proves the OSS frontend (src/) can import
// @widgetizer/editor-ui and that it resolves to the package source via the
// Vite/Vitest alias. Asserts against a real export (the slot contract).
describe("@widgetizer/editor-ui wiring", () => {
  it("is importable from src/ and resolves to the package source", () => {
    expect(Array.isArray(SLOT_NAMES)).toBe(true);
    expect(SLOT_NAMES).toContain("topbarRight");
  });
});
