import { describe, it, expect } from "vitest";
import { SLOT_NAMES } from "@widgetizer/editor-ui";

// Wiring smoke test: proves the OSS frontend can import @widgetizer/editor-ui
// through the Vite/Vitest alias and asserts against a real export.
describe("@widgetizer/editor-ui wiring", () => {
  it("is importable from src/ and resolves to the package source", () => {
    expect(Array.isArray(SLOT_NAMES)).toBe(true);
    expect(SLOT_NAMES).toContain("topbarRight");
  });
});
