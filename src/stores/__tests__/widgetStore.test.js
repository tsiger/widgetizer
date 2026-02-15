import { describe, it, expect, beforeEach } from "vitest";
import useWidgetStore from "../widgetStore";
import usePageStore from "../pageStore";

// ============================================================================
// Helpers
// ============================================================================

/** Minimal schema for a test widget type with one block type */
const TEST_SCHEMA = {
  type: "test-widget",
  settings: [
    { id: "title", type: "text", default: "Default Title" },
    { id: "color", type: "color", default: "#000" },
  ],
  blocks: [
    {
      type: "item",
      settings: [
        { id: "label", type: "text", default: "Item Label" },
        { id: "size", type: "select", default: "medium" },
      ],
    },
  ],
  defaultBlocks: [
    { type: "item", settings: { label: "First Item" } },
    { type: "item", settings: { label: "Second Item" } },
  ],
};

const SCHEMA_WITH_LIMIT = {
  ...TEST_SCHEMA,
  type: "limited-widget",
  maxBlocks: 2,
};

/** Seed the stores with a minimal page and schemas */
function seedStores(widgetsOverride = {}, widgetsOrderOverride = null) {
  const widgets = {
    "w-1": {
      type: "test-widget",
      settings: { title: "Hello" },
      blocks: {
        "b-1": { type: "item", settings: { label: "A" } },
        "b-2": { type: "item", settings: { label: "B" } },
      },
      blocksOrder: ["b-1", "b-2"],
    },
    "w-2": {
      type: "test-widget",
      settings: { title: "World" },
      blocks: {},
      blocksOrder: [],
    },
    ...widgetsOverride,
  };

  const widgetsOrder = widgetsOrderOverride || Object.keys(widgets);

  usePageStore.setState({
    page: { id: "test-page", widgets, widgetsOrder },
    originalPage: JSON.parse(JSON.stringify({ id: "test-page", widgets, widgetsOrder })),
    globalWidgets: {
      header: { type: "header", settings: { logo: "logo.png" }, blocks: {}, blocksOrder: [] },
      footer: { type: "footer", settings: { copyright: "2024" }, blocks: {}, blocksOrder: [] },
    },
  });

  useWidgetStore.setState({
    schemas: {
      "test-widget": TEST_SCHEMA,
      "limited-widget": SCHEMA_WITH_LIMIT,
    },
    selectedWidgetId: null,
    selectedBlockId: null,
    selectedGlobalWidgetId: null,
    selectedThemeGroup: null,
    hoveredWidgetId: null,
    hoveredBlockId: null,
  });
}

// ============================================================================
// Selection state
// ============================================================================

describe("selection state", () => {
  beforeEach(() => seedStores());

  it("setSelectedWidgetId selects widget and clears other selections", () => {
    const store = useWidgetStore.getState();
    store.setSelectedGlobalWidgetId("header");
    store.setSelectedWidgetId("w-1");

    const state = useWidgetStore.getState();
    expect(state.selectedWidgetId).toBe("w-1");
    expect(state.selectedBlockId).toBeNull();
    expect(state.selectedGlobalWidgetId).toBeNull();
    expect(state.selectedThemeGroup).toBeNull();
  });

  it("setSelectedBlockId sets block without clearing widget", () => {
    const store = useWidgetStore.getState();
    store.setSelectedWidgetId("w-1");
    store.setSelectedBlockId("b-1");

    const state = useWidgetStore.getState();
    expect(state.selectedWidgetId).toBe("w-1");
    expect(state.selectedBlockId).toBe("b-1");
  });

  it("setSelectedGlobalWidgetId clears page widget selection", () => {
    const store = useWidgetStore.getState();
    store.setSelectedWidgetId("w-1");
    store.setSelectedBlockId("b-1");
    store.setSelectedGlobalWidgetId("header");

    const state = useWidgetStore.getState();
    expect(state.selectedGlobalWidgetId).toBe("header");
    expect(state.selectedWidgetId).toBeNull();
    expect(state.selectedBlockId).toBeNull();
  });

  it("setSelectedThemeGroup clears all other selections", () => {
    const store = useWidgetStore.getState();
    store.setSelectedWidgetId("w-1");
    store.setSelectedThemeGroup("colors");

    const state = useWidgetStore.getState();
    expect(state.selectedThemeGroup).toBe("colors");
    expect(state.selectedWidgetId).toBeNull();
    expect(state.selectedGlobalWidgetId).toBeNull();
  });

  it("resetSelection clears everything", () => {
    const store = useWidgetStore.getState();
    store.setSelectedWidgetId("w-1");
    store.setSelectedBlockId("b-1");
    store.setHoveredWidget("w-2", "b-x");
    store.resetSelection();

    const state = useWidgetStore.getState();
    expect(state.selectedWidgetId).toBeNull();
    expect(state.selectedBlockId).toBeNull();
    expect(state.selectedGlobalWidgetId).toBeNull();
    expect(state.selectedThemeGroup).toBeNull();
    expect(state.hoveredWidgetId).toBeNull();
    expect(state.hoveredBlockId).toBeNull();
  });

  it("setHoveredWidget sets both widget and block hover", () => {
    useWidgetStore.getState().setHoveredWidget("w-1", "b-2");
    const state = useWidgetStore.getState();
    expect(state.hoveredWidgetId).toBe("w-1");
    expect(state.hoveredBlockId).toBe("b-2");
  });
});

// ============================================================================
// ID generation
// ============================================================================

describe("ID generation", () => {
  beforeEach(() => seedStores());

  it("generateWidgetId returns unique prefixed IDs", () => {
    const store = useWidgetStore.getState();
    const ids = new Set(Array.from({ length: 20 }, () => store.generateWidgetId()));
    expect(ids.size).toBe(20);
    for (const id of ids) {
      expect(id).toMatch(/^widget_/);
    }
  });

  it("generateBlockId returns unique prefixed IDs", () => {
    const store = useWidgetStore.getState();
    const ids = new Set(Array.from({ length: 20 }, () => store.generateBlockId()));
    expect(ids.size).toBe(20);
    for (const id of ids) {
      expect(id).toMatch(/^block_/);
    }
  });
});

// ============================================================================
// addWidget
// ============================================================================

describe("addWidget", () => {
  beforeEach(() => seedStores());

  it("creates a widget with schema default settings", () => {
    const newId = useWidgetStore.getState().addWidget("test-widget", 0);
    expect(newId).toMatch(/^widget_/);

    const page = usePageStore.getState().page;
    const widget = page.widgets[newId];
    expect(widget.type).toBe("test-widget");
    expect(widget.settings.title).toBe("Default Title");
    expect(widget.settings.color).toBe("#000");
  });

  it("creates default blocks from schema", () => {
    const newId = useWidgetStore.getState().addWidget("test-widget", 0);
    const page = usePageStore.getState().page;
    const widget = page.widgets[newId];

    expect(widget.blocksOrder.length).toBe(2);
    const firstBlock = widget.blocks[widget.blocksOrder[0]];
    expect(firstBlock.type).toBe("item");
    // defaultBlocks overrides schema defaults
    expect(firstBlock.settings.label).toBe("First Item");
    // schema default for size should still be applied
    expect(firstBlock.settings.size).toBe("medium");
  });

  it("inserts at the specified position", () => {
    const newId = useWidgetStore.getState().addWidget("test-widget", 0);
    const page = usePageStore.getState().page;
    expect(page.widgetsOrder[0]).toBe(newId);
  });

  it("appends when position exceeds length", () => {
    const newId = useWidgetStore.getState().addWidget("test-widget", 999);
    const page = usePageStore.getState().page;
    expect(page.widgetsOrder[page.widgetsOrder.length - 1]).toBe(newId);
  });

  it("selects the new widget after adding", () => {
    const newId = useWidgetStore.getState().addWidget("test-widget", 0);
    expect(useWidgetStore.getState().selectedWidgetId).toBe(newId);
  });

  it("returns null for unknown widget type", () => {
    expect(useWidgetStore.getState().addWidget("nonexistent", 0)).toBeNull();
  });
});

// ============================================================================
// duplicateWidget
// ============================================================================

describe("duplicateWidget", () => {
  beforeEach(() => seedStores());

  it("creates a deep copy with new IDs", () => {
    const newId = useWidgetStore.getState().duplicateWidget("w-1");
    expect(newId).toMatch(/^widget_/);
    expect(newId).not.toBe("w-1");

    const page = usePageStore.getState().page;
    const original = page.widgets["w-1"];
    const copy = page.widgets[newId];

    expect(copy.type).toBe(original.type);
    expect(copy.settings.title).toBe("Hello");
    expect(copy.blocksOrder.length).toBe(original.blocksOrder.length);
  });

  it("regenerates block IDs in the duplicate", () => {
    const newId = useWidgetStore.getState().duplicateWidget("w-1");
    const page = usePageStore.getState().page;
    const copy = page.widgets[newId];

    // New block IDs should not overlap with originals
    expect(copy.blocksOrder).not.toContain("b-1");
    expect(copy.blocksOrder).not.toContain("b-2");
    // But the same number of blocks
    expect(copy.blocksOrder.length).toBe(2);
  });

  it("places the copy immediately after the original", () => {
    const newId = useWidgetStore.getState().duplicateWidget("w-1");
    const page = usePageStore.getState().page;
    const idx = page.widgetsOrder.indexOf("w-1");
    expect(page.widgetsOrder[idx + 1]).toBe(newId);
  });

  it("selects the duplicate", () => {
    const newId = useWidgetStore.getState().duplicateWidget("w-1");
    expect(useWidgetStore.getState().selectedWidgetId).toBe(newId);
  });

  it("returns null for nonexistent widget", () => {
    expect(useWidgetStore.getState().duplicateWidget("nope")).toBeNull();
  });
});

// ============================================================================
// deleteWidget
// ============================================================================

describe("deleteWidget", () => {
  beforeEach(() => seedStores());

  it("removes the widget from page data and order", () => {
    useWidgetStore.getState().deleteWidget("w-1");
    const page = usePageStore.getState().page;
    expect(page.widgets["w-1"]).toBeUndefined();
    expect(page.widgetsOrder).not.toContain("w-1");
  });

  it("selects the previous widget when the selected widget is deleted", () => {
    useWidgetStore.setState({ selectedWidgetId: "w-2" });
    useWidgetStore.getState().deleteWidget("w-2");
    // w-2 was at index 1, so previous is w-1
    expect(useWidgetStore.getState().selectedWidgetId).toBe("w-1");
  });

  it("selects the next widget when the first widget is deleted", () => {
    useWidgetStore.setState({ selectedWidgetId: "w-1" });
    useWidgetStore.getState().deleteWidget("w-1");
    // w-1 was at index 0, so next is w-2
    expect(useWidgetStore.getState().selectedWidgetId).toBe("w-2");
  });

  it("selects null when the only widget is deleted", () => {
    // Remove w-2 first, then delete w-1
    useWidgetStore.getState().deleteWidget("w-2");
    useWidgetStore.setState({ selectedWidgetId: "w-1" });
    useWidgetStore.getState().deleteWidget("w-1");
    expect(useWidgetStore.getState().selectedWidgetId).toBeNull();
  });

  it("does not change selection when a non-selected widget is deleted", () => {
    useWidgetStore.setState({ selectedWidgetId: "w-1" });
    useWidgetStore.getState().deleteWidget("w-2");
    expect(useWidgetStore.getState().selectedWidgetId).toBe("w-1");
  });
});

// ============================================================================
// updateWidgetSettings / updateGlobalWidgetSettings
// ============================================================================

describe("updateWidgetSettings", () => {
  beforeEach(() => seedStores());

  it("updates a setting on a page widget", () => {
    useWidgetStore.getState().updateWidgetSettings("w-1", "title", "New Title");
    const page = usePageStore.getState().page;
    expect(page.widgets["w-1"].settings.title).toBe("New Title");
  });

  it("creates settings object if missing", () => {
    // Set up a widget with no settings
    const page = usePageStore.getState().page;
    page.widgets["w-no-settings"] = { type: "test-widget", blocks: {}, blocksOrder: [] };
    page.widgetsOrder.push("w-no-settings");
    usePageStore.setState({ page: { ...page } });

    useWidgetStore.getState().updateWidgetSettings("w-no-settings", "title", "Created");
    const updated = usePageStore.getState().page;
    expect(updated.widgets["w-no-settings"].settings.title).toBe("Created");
  });

  it("does nothing for nonexistent widget", () => {
    const before = JSON.stringify(usePageStore.getState().page);
    useWidgetStore.getState().updateWidgetSettings("nope", "title", "x");
    expect(JSON.stringify(usePageStore.getState().page)).toBe(before);
  });
});

describe("updateGlobalWidgetSettings", () => {
  beforeEach(() => seedStores());

  it("updates a header setting", () => {
    useWidgetStore.getState().updateGlobalWidgetSettings("header", "logo", "new-logo.png");
    const gw = usePageStore.getState().globalWidgets;
    expect(gw.header.settings.logo).toBe("new-logo.png");
  });

  it("updates a footer setting", () => {
    useWidgetStore.getState().updateGlobalWidgetSettings("footer", "copyright", "2025");
    const gw = usePageStore.getState().globalWidgets;
    expect(gw.footer.settings.copyright).toBe("2025");
  });

  it("does nothing for invalid widget type", () => {
    const before = JSON.stringify(usePageStore.getState().globalWidgets);
    useWidgetStore.getState().updateGlobalWidgetSettings("sidebar", "x", "y");
    expect(JSON.stringify(usePageStore.getState().globalWidgets)).toBe(before);
  });
});

// ============================================================================
// reorderWidgets
// ============================================================================

describe("reorderWidgets", () => {
  beforeEach(() => seedStores());

  it("updates the widget order", () => {
    useWidgetStore.getState().reorderWidgets(["w-2", "w-1"]);
    const page = usePageStore.getState().page;
    expect(page.widgetsOrder).toEqual(["w-2", "w-1"]);
  });

  it("only keeps widgets that exist in the data", () => {
    useWidgetStore.getState().reorderWidgets(["w-2", "w-1", "w-ghost"]);
    const page = usePageStore.getState().page;
    // w-ghost doesn't exist in page.widgets, so reorderedWidgets won't have it
    expect(Object.keys(page.widgets)).not.toContain("w-ghost");
  });
});

// ============================================================================
// Block operations: addBlock, deleteBlock, duplicateBlock, reorderBlocks
// ============================================================================

describe("addBlock", () => {
  beforeEach(() => seedStores());

  it("adds a block with schema defaults to the end", () => {
    const blockId = useWidgetStore.getState().addBlock("w-2", "item");
    expect(blockId).toMatch(/^block_/);

    const page = usePageStore.getState().page;
    const widget = page.widgets["w-2"];
    expect(widget.blocksOrder).toContain(blockId);
    expect(widget.blocks[blockId].type).toBe("item");
    expect(widget.blocks[blockId].settings.label).toBe("Item Label");
    expect(widget.blocks[blockId].settings.size).toBe("medium");
  });

  it("inserts at a specific position", () => {
    const blockId = useWidgetStore.getState().addBlock("w-1", "item", 0);
    const page = usePageStore.getState().page;
    expect(page.widgets["w-1"].blocksOrder[0]).toBe(blockId);
  });

  it("appends when position is null", () => {
    const blockId = useWidgetStore.getState().addBlock("w-1", "item", null);
    const page = usePageStore.getState().page;
    const order = page.widgets["w-1"].blocksOrder;
    expect(order[order.length - 1]).toBe(blockId);
  });

  it("returns null when maxBlocks is reached", () => {
    // Seed a limited widget with 2 blocks (at its max of 2)
    seedStores({
      "w-limited": {
        type: "limited-widget",
        settings: {},
        blocks: { "b-x": { type: "item", settings: {} }, "b-y": { type: "item", settings: {} } },
        blocksOrder: ["b-x", "b-y"],
      },
    });

    const result = useWidgetStore.getState().addBlock("w-limited", "item");
    expect(result).toBeNull();
  });

  it("returns null for unknown block type", () => {
    const result = useWidgetStore.getState().addBlock("w-1", "nonexistent");
    expect(result).toBeNull();
  });

  it("works for global widgets (header/footer)", () => {
    // header needs a schema
    useWidgetStore.setState({
      schemas: {
        ...useWidgetStore.getState().schemas,
        header: {
          type: "header",
          blocks: [{ type: "nav-link", settings: [{ id: "url", type: "text", default: "/" }] }],
        },
      },
    });

    const blockId = useWidgetStore.getState().addBlock("header", "nav-link");
    expect(blockId).toMatch(/^block_/);
    const gw = usePageStore.getState().globalWidgets;
    expect(gw.header.blocksOrder).toContain(blockId);
  });
});

describe("deleteBlock", () => {
  beforeEach(() => seedStores());

  it("removes a block from the widget", () => {
    useWidgetStore.getState().deleteBlock("w-1", "b-1");
    const page = usePageStore.getState().page;
    expect(page.widgets["w-1"].blocks["b-1"]).toBeUndefined();
    expect(page.widgets["w-1"].blocksOrder).not.toContain("b-1");
  });

  it("selects the previous block when the selected block is deleted", () => {
    useWidgetStore.setState({ selectedBlockId: "b-2" });
    useWidgetStore.getState().deleteBlock("w-1", "b-2");
    expect(useWidgetStore.getState().selectedBlockId).toBe("b-1");
  });

  it("selects the next block when the first block is deleted", () => {
    useWidgetStore.setState({ selectedBlockId: "b-1" });
    useWidgetStore.getState().deleteBlock("w-1", "b-1");
    expect(useWidgetStore.getState().selectedBlockId).toBe("b-2");
  });

  it("selects null when the only block is deleted", () => {
    // Remove b-2 first
    useWidgetStore.getState().deleteBlock("w-1", "b-2");
    useWidgetStore.setState({ selectedBlockId: "b-1" });
    useWidgetStore.getState().deleteBlock("w-1", "b-1");
    expect(useWidgetStore.getState().selectedBlockId).toBeNull();
  });
});

describe("duplicateBlock", () => {
  beforeEach(() => seedStores());

  it("creates a deep copy of the block", () => {
    const newId = useWidgetStore.getState().duplicateBlock("w-1", "b-1");
    expect(newId).toMatch(/^block_/);

    const page = usePageStore.getState().page;
    const widget = page.widgets["w-1"];
    expect(widget.blocks[newId].type).toBe("item");
    expect(widget.blocks[newId].settings.label).toBe("A");
  });

  it("places the copy immediately after the original", () => {
    const newId = useWidgetStore.getState().duplicateBlock("w-1", "b-1");
    const page = usePageStore.getState().page;
    const order = page.widgets["w-1"].blocksOrder;
    const idx = order.indexOf("b-1");
    expect(order[idx + 1]).toBe(newId);
  });

  it("returns null when maxBlocks would be exceeded", () => {
    seedStores({
      "w-limited": {
        type: "limited-widget",
        settings: {},
        blocks: { "b-x": { type: "item", settings: {} }, "b-y": { type: "item", settings: {} } },
        blocksOrder: ["b-x", "b-y"],
      },
    });
    const result = useWidgetStore.getState().duplicateBlock("w-limited", "b-x");
    expect(result).toBeNull();
  });

  it("returns null for nonexistent block", () => {
    expect(useWidgetStore.getState().duplicateBlock("w-1", "nope")).toBeNull();
  });
});

describe("reorderBlocks", () => {
  beforeEach(() => seedStores());

  it("updates the block order", () => {
    useWidgetStore.getState().reorderBlocks("w-1", ["b-2", "b-1"]);
    const page = usePageStore.getState().page;
    expect(page.widgets["w-1"].blocksOrder).toEqual(["b-2", "b-1"]);
  });
});

// ============================================================================
// updateBlockSettings
// ============================================================================

describe("updateBlockSettings", () => {
  beforeEach(() => seedStores());

  it("updates a setting on a block", () => {
    useWidgetStore.getState().updateBlockSettings("w-1", "b-1", "label", "Updated");
    const page = usePageStore.getState().page;
    expect(page.widgets["w-1"].blocks["b-1"].settings.label).toBe("Updated");
  });

  it("does nothing for nonexistent widget", () => {
    const before = JSON.stringify(usePageStore.getState().page);
    useWidgetStore.getState().updateBlockSettings("nope", "b-1", "label", "x");
    expect(JSON.stringify(usePageStore.getState().page)).toBe(before);
  });

  it("does nothing for nonexistent block", () => {
    const before = JSON.stringify(usePageStore.getState().page);
    useWidgetStore.getState().updateBlockSettings("w-1", "nope", "label", "x");
    expect(JSON.stringify(usePageStore.getState().page)).toBe(before);
  });
});
