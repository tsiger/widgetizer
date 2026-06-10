import { describe, it, expect } from "vitest";
import { EDITOR_UI_PACKAGE } from "@widgetizer/editor-ui";

// Sprint 1.5a wiring smoke test: proves the OSS frontend (src/) can import
// @widgetizer/editor-ui and that it resolves to the package source via the
// Vite/Vitest alias. Updated/removed as real exports land in 1.5b–1.5e.
describe("@widgetizer/editor-ui wiring", () => {
  it("is importable from src/ and resolves to the package source", () => {
    expect(EDITOR_UI_PACKAGE).toBe("@widgetizer/editor-ui");
  });
});
