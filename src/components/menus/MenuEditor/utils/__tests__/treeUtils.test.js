import { describe, expect, it } from "vitest";
import { applyDrop, flattenTree, getProjection, removeActiveFromFlat } from "../treeUtils";

function getFlatWithoutActive(items, expandedIds, activeId) {
  const flat = flattenTree(items, expandedIds);
  return removeActiveFromFlat(flat, activeId);
}

function getRowRects(flatItems) {
  return flatItems.map((item, index) => ({
    id: item.id,
    top: index * 100,
    bottom: index * 100 + 80,
    mid: index * 100 + 40,
  }));
}

describe("treeUtils getProjection", () => {
  it("projects top insertion as top-level above the first row", () => {
    const items = [
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [{ id: "atlas", label: "Atlas", items: [] }] },
      { id: "services", label: "Services", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, ["case"], "atlas");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 10, 0, 32, 1, 0, rowRects);

    expect(projection).toEqual({
      depth: 0,
      parentId: null,
      targetIndex: 0,
      indicatorId: "about",
      indicatorPosition: "above",
    });
  });

  it("keeps the active depth by default when moving into a new gap", () => {
    const items = [
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [{ id: "atlas", label: "Atlas", items: [] }] },
      { id: "services", label: "Services", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, ["case"], "atlas");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 150, 0, 32, 1, 0, rowRects);

    expect(projection).toEqual({
      depth: 1,
      parentId: "case",
      targetIndex: 2,
      indicatorId: "case",
      indicatorPosition: "below",
    });
  });

  it("requires intentional right drag to nest under the previous row", () => {
    const items = [
      { id: "about", label: "About", items: [] },
      { id: "services", label: "Services", items: [] },
      { id: "atlas", label: "Atlas", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, [], "atlas");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 150, 40, 32, 0, 0, rowRects);

    expect(projection).toEqual({
      depth: 1,
      parentId: "services",
      targetIndex: 2,
      indicatorId: "services",
      indicatorPosition: "below",
    });
  });

  it("clamps nesting so items with descendants do not exceed level 2", () => {
    const items = [
      {
        id: "root",
        label: "Root",
        items: [
          {
            id: "child",
            label: "Child",
            items: [{ id: "grandchild", label: "Grandchild", items: [] }],
          },
        ],
      },
      { id: "other", label: "Other", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, ["root", "child"], "child");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 150, 96, 32, 1, 1, rowRects);

    expect(projection).toEqual({
      depth: 1,
      parentId: "other",
      targetIndex: 2,
      indicatorId: "other",
      indicatorPosition: "below",
    });
  });
});

describe("treeUtils applyDrop", () => {
  it("moves a child to the first top-level slot", () => {
    const items = [
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [{ id: "atlas", label: "Atlas", items: [] }] },
      { id: "services", label: "Services", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, ["case"], "atlas");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 10, 0, 32, 1, 0, rowRects);
    const result = applyDrop(items, "atlas", projection, flatWithoutActive);

    expect(result).toEqual([
      { id: "atlas", label: "Atlas", items: [] },
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [] },
      { id: "services", label: "Services", items: [] },
    ]);
  });

  it("keeps a child nested by default when moved into a lower gap", () => {
    const items = [
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [{ id: "atlas", label: "Atlas", items: [] }] },
      { id: "services", label: "Services", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, ["case"], "atlas");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 150, 0, 32, 1, 0, rowRects);
    const result = applyDrop(items, "atlas", projection, flatWithoutActive);

    expect(result).toEqual([
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [{ id: "atlas", label: "Atlas", items: [] }] },
      { id: "services", label: "Services", items: [] },
    ]);
  });

  it("outdents into a top-level between-siblings slot after a deliberate left drag", () => {
    const items = [
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [{ id: "atlas", label: "Atlas", items: [] }] },
      { id: "services", label: "Services", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, ["case"], "atlas");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 150, -40, 32, 1, 0, rowRects);
    const result = applyDrop(items, "atlas", projection, flatWithoutActive);

    expect(projection).toEqual({
      depth: 0,
      parentId: null,
      targetIndex: 2,
      indicatorId: "case",
      indicatorPosition: "below",
    });

    expect(result).toEqual([
      { id: "about", label: "About", items: [] },
      { id: "case", label: "Case Studies", items: [] },
      { id: "atlas", label: "Atlas", items: [] },
      { id: "services", label: "Services", items: [] },
    ]);
  });

  it("nests under the previous top-level row only after a deliberate right drag", () => {
    const items = [
      { id: "about", label: "About", items: [] },
      { id: "services", label: "Services", items: [] },
      { id: "atlas", label: "Atlas", items: [] },
    ];

    const flatWithoutActive = getFlatWithoutActive(items, [], "atlas");
    const rowRects = getRowRects(flatWithoutActive);
    const projection = getProjection(flatWithoutActive, 150, 40, 32, 0, 0, rowRects);
    const result = applyDrop(items, "atlas", projection, flatWithoutActive);

    expect(result).toEqual([
      { id: "about", label: "About", items: [] },
      { id: "services", label: "Services", items: [{ id: "atlas", label: "Atlas", items: [] }] },
    ]);
  });
});
