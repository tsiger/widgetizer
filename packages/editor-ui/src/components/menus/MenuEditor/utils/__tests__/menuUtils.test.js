import { describe, it, expect } from "vitest";
import { generateId, ensureIds, getItemAtPath, findItemById } from "../menuUtils";

// ============================================================================
// generateId
// ============================================================================

describe("generateId", () => {
  it("returns a string starting with 'item-'", () => {
    expect(generateId()).toMatch(/^item-.+/);
  });

  it("generates unique IDs on each call", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

// ============================================================================
// ensureIds
// ============================================================================

describe("ensureIds", () => {
  it("adds IDs to items that have none", () => {
    const items = [{ label: "Home" }, { label: "About" }];
    const result = ensureIds(items);
    expect(result[0].id).toMatch(/^item-/);
    expect(result[1].id).toMatch(/^item-/);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it("preserves existing IDs", () => {
    const items = [{ id: "keep-me", label: "Home" }];
    const result = ensureIds(items);
    expect(result[0].id).toBe("keep-me");
  });

  it("recursively adds IDs to nested children", () => {
    const items = [
      {
        label: "Parent",
        items: [{ label: "Child" }, { label: "Child 2" }],
      },
    ];
    const result = ensureIds(items);
    expect(result[0].id).toMatch(/^item-/);
    expect(result[0].items[0].id).toMatch(/^item-/);
    expect(result[0].items[1].id).toMatch(/^item-/);
  });

  it("initializes items array to empty when missing", () => {
    const items = [{ label: "Leaf" }];
    const result = ensureIds(items);
    expect(result[0].items).toEqual([]);
  });

  it("initializes items array to empty when it is not an array", () => {
    const items = [{ label: "Leaf", items: "bad" }];
    const result = ensureIds(items);
    expect(result[0].items).toEqual([]);
  });

  it("returns empty array for null input", () => {
    expect(ensureIds(null)).toEqual([]);
  });

  it("returns empty array for undefined input", () => {
    expect(ensureIds(undefined)).toEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(ensureIds("not-an-array")).toEqual([]);
  });

  it("does not mutate the original items", () => {
    const items = [{ label: "A" }];
    const result = ensureIds(items);
    expect(items[0].id).toBeUndefined();
    expect(result[0].id).toBeDefined();
  });
});

// ============================================================================
// getItemAtPath
// ============================================================================

describe("getItemAtPath", () => {
  const items = [
    {
      id: "a",
      label: "Home",
      items: [
        { id: "b", label: "Sub 1", items: [] },
        { id: "c", label: "Sub 2", items: [{ id: "d", label: "Deep", items: [] }] },
      ],
    },
    { id: "e", label: "About", items: [] },
  ];

  it("returns a top-level item by index", () => {
    expect(getItemAtPath(items, [0])).toBe(items[0]);
  });

  it("returns a second top-level item", () => {
    expect(getItemAtPath(items, [1])).toBe(items[1]);
  });

  it("traverses into nested items", () => {
    // path: items[0].items[1] → "Sub 2"
    expect(getItemAtPath(items, [0, "items", 1])).toBe(items[0].items[1]);
  });

  it("traverses deeply nested items", () => {
    // path: items[0].items[1].items[0] → "Deep"
    expect(getItemAtPath(items, [0, "items", 1, "items", 0])).toBe(items[0].items[1].items[0]);
  });

  it("returns the items array when path ends at 'items'", () => {
    expect(getItemAtPath(items, [0, "items"])).toBe(items[0].items);
  });
});

// ============================================================================
// findItemById
// ============================================================================

describe("findItemById", () => {
  const items = [
    {
      id: "root-1",
      label: "Home",
      items: [
        { id: "child-1", label: "Sub 1", items: [] },
        {
          id: "child-2",
          label: "Sub 2",
          items: [{ id: "grandchild-1", label: "Deep", items: [] }],
        },
      ],
    },
    { id: "root-2", label: "About", items: [] },
  ];

  it("finds a top-level item", () => {
    const result = findItemById(items, "root-1");
    expect(result).not.toBeNull();
    expect(result.item.id).toBe("root-1");
    expect(result.path).toEqual([0]);
  });

  it("finds a second top-level item", () => {
    const result = findItemById(items, "root-2");
    expect(result.item.id).toBe("root-2");
    expect(result.path).toEqual([1]);
  });

  it("finds a nested child", () => {
    const result = findItemById(items, "child-2");
    expect(result).not.toBeNull();
    expect(result.item.label).toBe("Sub 2");
    expect(result.path).toEqual([0, "items", 1]);
  });

  it("finds a deeply nested grandchild", () => {
    const result = findItemById(items, "grandchild-1");
    expect(result).not.toBeNull();
    expect(result.item.label).toBe("Deep");
    expect(result.path).toEqual([0, "items", 1, "items", 0]);
  });

  it("returns parentItems for nested items", () => {
    const result = findItemById(items, "child-1");
    expect(result.parentItems).toBe(items[0].items);
  });

  it("returns the root array as parentItems for top-level items", () => {
    const result = findItemById(items, "root-1");
    expect(result.parentItems).toBe(items);
  });

  it("returns null for non-existent ID", () => {
    expect(findItemById(items, "nope")).toBeNull();
  });

  it("returns null for null items array", () => {
    expect(findItemById(null, "root-1")).toBeNull();
  });

  it("returns null for non-array items", () => {
    expect(findItemById("bad", "root-1")).toBeNull();
  });

  it("uses cache on second lookup", () => {
    const cache = new Map();
    const first = findItemById(items, "grandchild-1", [], null, cache);
    expect(cache.has("grandchild-1")).toBe(true);

    // Second call should hit cache — returns same object
    const second = findItemById(items, "grandchild-1", [], null, cache);
    expect(second).toBe(first);
  });
});
