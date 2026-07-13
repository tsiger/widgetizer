import { describe, it, expect } from "vitest";
import { isEditableTarget, resolveDeleteTarget } from "../useDeleteKeyShortcut";

describe("isEditableTarget", () => {
  it("is true for form fields and contenteditable", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false for non-editable elements and nullish targets", () => {
    expect(isEditableTarget({ tagName: "DIV" })).toBe(false);
    expect(isEditableTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
  });
});

describe("resolveDeleteTarget", () => {
  it("targets a block inside a page widget (block wins over widget)", () => {
    expect(
      resolveDeleteTarget({ selectedWidgetId: "w-1", selectedBlockId: "b-1", selectedGlobalWidgetId: null }),
    ).toEqual({ type: "block", widgetId: "w-1", blockId: "b-1", isGlobal: false });
  });

  it("targets a block inside a global widget and flags it global", () => {
    expect(
      resolveDeleteTarget({ selectedWidgetId: null, selectedBlockId: "b-9", selectedGlobalWidgetId: "header" }),
    ).toEqual({ type: "block", widgetId: "header", blockId: "b-9", isGlobal: true });
  });

  it("targets a page widget when no block is selected", () => {
    expect(
      resolveDeleteTarget({ selectedWidgetId: "w-2", selectedBlockId: null, selectedGlobalWidgetId: null }),
    ).toEqual({ type: "widget", widgetId: "w-2" });
  });

  it("returns null for a global widget with no block (header/footer are singletons)", () => {
    expect(
      resolveDeleteTarget({ selectedWidgetId: null, selectedBlockId: null, selectedGlobalWidgetId: "footer" }),
    ).toBeNull();
  });

  it("returns null when nothing is selected", () => {
    expect(
      resolveDeleteTarget({ selectedWidgetId: null, selectedBlockId: null, selectedGlobalWidgetId: null }),
    ).toBeNull();
  });
});
