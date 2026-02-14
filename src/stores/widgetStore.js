import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { getProjectWidgets } from "../queries/previewManager";
import usePageStore from "./pageStore";
import useAutoSave from "./saveStore";
import { hasReachedMaxBlocks } from "../utils/blockLimits";

export { hasReachedMaxBlocks };

/**
 * Zustand store for managing widget operations in the page editor.
 * Handles widget schemas, selection state, and CRUD operations for widgets and blocks.
 *
 * @typedef {Object} WidgetStore
 * @property {Object<string, Object>} schemas - Map of widget type to schema definition
 * @property {string|null} selectedWidgetId - ID of the currently selected widget
 * @property {string|null} selectedBlockId - ID of the currently selected block within a widget
 * @property {string|null} selectedGlobalWidgetId - ID of selected global widget ('header' or 'footer')
 * @property {string|null} selectedThemeGroup - Key of the selected theme settings group
 * @property {string|null} hoveredWidgetId - ID of the widget being hovered over
 * @property {string|null} hoveredBlockId - ID of the block being hovered over
 * @property {boolean} loading - Whether widget schemas are being loaded
 * @property {string|null} error - Error message if schema loading failed
 * @property {Function} loadSchemas - Fetch widget schemas from the server
 * @property {Function} setSelectedWidgetId - Select a page widget (clears other selections)
 * @property {Function} setSelectedBlockId - Select a block within the current widget
 * @property {Function} setSelectedGlobalWidgetId - Select a global widget (clears other selections)
 * @property {Function} setSelectedThemeGroup - Select a theme settings group (clears other selections)
 * @property {Function} setHoveredWidget - Set hover state for widget/block highlighting
 * @property {Function} resetSelection - Clear all selection and hover states
 * @property {Function} generateWidgetId - Generate a unique widget ID
 * @property {Function} generateBlockId - Generate a unique block ID
 * @property {Function} addWidget - Add a new widget at a specified position
 * @property {Function} duplicateWidget - Create a copy of an existing widget
 * @property {Function} deleteWidget - Remove a widget from the page
 * @property {Function} updateWidgetSettings - Update a setting value for a widget
 * @property {Function} updateGlobalWidgetSettings - Update a setting for a global widget
 * @property {Function} reorderWidgets - Change the order of widgets on the page
 * @property {Function} addBlock - Add a new block to a widget
 * @property {Function} reorderBlocks - Change the order of blocks within a widget
 * @property {Function} deleteBlock - Remove a block from a widget
 * @property {Function} updateBlockSettings - Update a setting value for a block
 * @property {Function} duplicateBlock - Create a copy of an existing block
 */

const useWidgetStore = create((set, get) => ({
  // State
  schemas: {},
  selectedWidgetId: null,
  selectedBlockId: null,
  selectedGlobalWidgetId: null,
  selectedThemeGroup: null,
  hoveredWidgetId: null,
  hoveredBlockId: null,
  loading: false,
  error: null,

  // Actions
  loadSchemas: async () => {
    set({ loading: true, error: null });
    try {
      const schemas = await getProjectWidgets();
      const schemasMap = {};
      schemas.forEach((schema) => {
        schemasMap[schema.type] = schema;
      });
      set({ schemas: schemasMap, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      console.error("Failed to load widget schemas:", err);
    }
  },

  setSelectedWidgetId: (id) => {
    set({
      selectedWidgetId: id,
      selectedBlockId: null,
      selectedGlobalWidgetId: null,
      selectedThemeGroup: null,
    });
  },

  setSelectedBlockId: (blockId) => {
    set({ selectedBlockId: blockId });
  },

  setSelectedGlobalWidgetId: (id) => {
    set({
      selectedGlobalWidgetId: id,
      selectedWidgetId: null,
      selectedBlockId: null,
      selectedThemeGroup: null,
    });
  },

  setSelectedThemeGroup: (groupKey) => {
    set({
      selectedThemeGroup: groupKey,
      selectedWidgetId: null,
      selectedBlockId: null,
      selectedGlobalWidgetId: null,
    });
  },

  setHoveredWidget: (widgetId, blockId = null) => {
    set({
      hoveredWidgetId: widgetId,
      hoveredBlockId: blockId,
    });
  },

  resetSelection: () => {
    set({
      selectedWidgetId: null,
      selectedBlockId: null,
      selectedGlobalWidgetId: null,
      selectedThemeGroup: null,
      hoveredWidgetId: null,
      hoveredBlockId: null,
    });
  },

  generateWidgetId: () => {
    return `widget_${uuidv4()}`;
  },

  generateBlockId: () => {
    return `block_${uuidv4()}`;
  },

  addWidget: (widgetType, position) => {
    const { schemas } = get();
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !schemas[widgetType]) return null;

    const schema = schemas[widgetType];
    const defaultSettings = {};

    if (Array.isArray(schema.settings)) {
      schema.settings.forEach((setting) => {
        defaultSettings[setting.id] = setting.default;
      });
    }

    // Process default blocks if defined in schema
    const blocks = {};
    const blocksOrder = [];

    if (Array.isArray(schema.defaultBlocks)) {
      schema.defaultBlocks.forEach((defaultBlock) => {
        const blockId = get().generateBlockId();

        // Get block schema for this block type to apply defaults
        const blockSchema = schema.blocks?.find((b) => b.type === defaultBlock.type);

        // Start with defaults from block schema
        const blockSettings = {};
        if (blockSchema && Array.isArray(blockSchema.settings)) {
          blockSchema.settings.forEach((setting) => {
            if (setting.default !== undefined) {
              blockSettings[setting.id] = setting.default;
            }
          });
        }

        // Override with values from defaultBlocks
        if (defaultBlock.settings) {
          Object.assign(blockSettings, defaultBlock.settings);
        }

        blocks[blockId] = {
          type: defaultBlock.type,
          settings: blockSettings,
        };
        blocksOrder.push(blockId);
      });
    }

    const newWidgetId = get().generateWidgetId();
    const newWidget = {
      type: widgetType,
      settings: defaultSettings,
      blocks,
      blocksOrder,
    };

    const currentOrder = page.widgetsOrder || Object.keys(page.widgets);
    const newWidgetsOrder = [...currentOrder];

    if (position >= newWidgetsOrder.length) {
      newWidgetsOrder.push(newWidgetId);
    } else {
      newWidgetsOrder.splice(position, 0, newWidgetId);
    }

    pageStore.setPage({
      ...page,
      widgets: {
        ...page.widgets,
        [newWidgetId]: newWidget,
      },
      widgetsOrder: newWidgetsOrder,
    });

    // Clear other selection states and select the new widget (same as setSelectedWidgetId)
    set({
      selectedWidgetId: newWidgetId,
      selectedBlockId: null,
      selectedGlobalWidgetId: null,
      selectedThemeGroup: null,
    });
    useAutoSave.getState().setStructureModified(true);
    return newWidgetId;
  },

  duplicateWidget: (widgetId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !page.widgets[widgetId]) return null;

    const originalWidget = page.widgets[widgetId];

    const newBlocks = {};
    const newBlocksOrder = [];

    if (originalWidget.blocks) {
      originalWidget.blocksOrder?.forEach((oldBlockId) => {
        const newBlockId = get().generateBlockId();
        newBlocks[newBlockId] = { ...originalWidget.blocks[oldBlockId] };
        newBlocksOrder.push(newBlockId);
      });
    }

    const newWidgetId = get().generateWidgetId();
    const newWidget = {
      ...JSON.parse(JSON.stringify(originalWidget)),
      blocks: newBlocks,
      blocksOrder: newBlocksOrder,
    };

    const currentOrder = page.widgetsOrder || Object.keys(page.widgets);
    const originalIndex = currentOrder.indexOf(widgetId);

    const newWidgetsOrder = [...currentOrder];
    if (originalIndex !== -1) {
      newWidgetsOrder.splice(originalIndex + 1, 0, newWidgetId);
    } else {
      newWidgetsOrder.push(newWidgetId); // Fallback to add at the end
    }

    pageStore.setPage({
      ...page,
      widgets: {
        ...page.widgets,
        [newWidgetId]: newWidget,
      },
      widgetsOrder: newWidgetsOrder,
    });

    // Select the new widget, clear other selection + hover state, and mark changes for auto-save
    set({
      selectedWidgetId: newWidgetId,
      selectedBlockId: null,
      selectedGlobalWidgetId: null,
      selectedThemeGroup: null,
      hoveredWidgetId: null,
      hoveredBlockId: null,
    });
    useAutoSave.getState().setStructureModified(true);

    return newWidgetId;
  },

  deleteWidget: (widgetId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    const { selectedWidgetId } = get();

    if (!page || !widgetId) return;

    // eslint-disable-next-line no-unused-vars
    const { [widgetId]: deletedWidget, ...remainingWidgets } = page.widgets;

    const currentOrder = page.widgetsOrder || Object.keys(page.widgets);
    const newWidgetsOrder = currentOrder.filter((id) => id !== widgetId);

    pageStore.setPage({
      ...page,
      widgets: remainingWidgets,
      widgetsOrder: newWidgetsOrder,
    });

    useAutoSave.getState().setStructureModified(true);

    if (selectedWidgetId === widgetId) {
      const deletedIndex = currentOrder.indexOf(widgetId);
      const nextWidgetId = deletedIndex !== -1 ? newWidgetsOrder[deletedIndex] : null;
      set({ selectedWidgetId: nextWidgetId || null });
    }
  },

  updateWidgetSettings: (widgetId, settingId, value) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !widgetId) return;

    const updatedPage = JSON.parse(JSON.stringify(page));
    if (!updatedPage.widgets[widgetId]) return;

    if (!updatedPage.widgets[widgetId].settings) {
      updatedPage.widgets[widgetId].settings = {};
    }

    updatedPage.widgets[widgetId].settings[settingId] = value;
    pageStore.setPage(updatedPage);
  },

  updateGlobalWidgetSettings: (widgetType, settingId, value) => {
    const pageStore = usePageStore.getState();

    if (widgetType !== "header" && widgetType !== "footer") return;

    const { globalWidgets } = pageStore;
    const currentWidget = globalWidgets[widgetType];

    if (!currentWidget) return;

    const updatedSettings = {
      ...currentWidget.settings,
      [settingId]: value,
    };

    pageStore.updateGlobalWidget(widgetType, { settings: updatedSettings });
  },

  reorderWidgets: (newOrder) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page) return;

    const reorderedWidgets = {};
    newOrder.forEach((widgetId) => {
      if (page.widgets[widgetId]) {
        reorderedWidgets[widgetId] = page.widgets[widgetId];
      }
    });

    pageStore.setPage({
      ...page,
      widgets: reorderedWidgets,
      widgetsOrder: newOrder,
    });

    useAutoSave.getState().setStructureModified(true);
  },

  addBlock: (widgetId, blockType, position = null) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    const { schemas } = get();

    if (!page || !page.widgets[widgetId]) return null;

    const widget = page.widgets[widgetId];
    const widgetSchema = schemas[widget.type];

    if (hasReachedMaxBlocks(widget, widgetSchema)) return null;

    const blockSchema = widgetSchema.blocks?.find((block) => block.type === blockType);

    if (!blockSchema) return null;

    const blockId = get().generateBlockId();

    const defaultSettings = {};
    if (Array.isArray(blockSchema.settings)) {
      blockSchema.settings.forEach((setting) => {
        defaultSettings[setting.id] = setting.default;
      });
    }

    const newBlock = {
      type: blockType,
      settings: defaultSettings,
    };

    // Handle positional insertion
    const currentBlocksOrder = widget.blocksOrder || [];
    let newBlocksOrder;

    if (position === null || position === "add" || position >= currentBlocksOrder.length) {
      // Add to the end (default behavior)
      newBlocksOrder = [...currentBlocksOrder, blockId];
    } else {
      // Insert at specific position
      newBlocksOrder = [...currentBlocksOrder];
      newBlocksOrder.splice(position, 0, blockId);
    }

    const updatedWidget = {
      ...widget,
      blocks: {
        ...(widget.blocks || {}),
        [blockId]: newBlock,
      },
      blocksOrder: newBlocksOrder,
    };

    const updatedPage = {
      ...page,
      widgets: {
        ...page.widgets,
        [widgetId]: updatedWidget,
      },
    };

    pageStore.setPage(updatedPage);
    return blockId;
  },

  reorderBlocks: (widgetId, newOrder) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !page.widgets[widgetId]) return;

    const updatedWidget = {
      ...page.widgets[widgetId],
      blocksOrder: newOrder,
    };

    const updatedPage = {
      ...page,
      widgets: {
        ...page.widgets,
        [widgetId]: updatedWidget,
      },
    };

    pageStore.setPage(updatedPage);

    useAutoSave.getState().setStructureModified(true);
  },

  deleteBlock: (widgetId, blockId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    const { selectedBlockId } = get();

    if (!page || !page.widgets[widgetId]) return;

    const widget = page.widgets[widgetId];
    // eslint-disable-next-line no-unused-vars
    const { [blockId]: deletedBlock, ...remainingBlocks } = widget.blocks || {};
    const updatedBlocksOrder = (widget.blocksOrder || []).filter((id) => id !== blockId);

    const updatedWidget = {
      ...widget,
      blocks: remainingBlocks,
      blocksOrder: updatedBlocksOrder,
    };

    const updatedPage = {
      ...page,
      widgets: {
        ...page.widgets,
        [widgetId]: updatedWidget,
      },
    };

    pageStore.setPage(updatedPage);

    if (selectedBlockId === blockId) {
      set({ selectedBlockId: null });
    }
  },

  updateBlockSettings: (widgetId, blockId, settingId, value) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !page.widgets[widgetId]) return;

    const widget = page.widgets[widgetId];
    if (!widget.blocks?.[blockId]) return;

    const updatedBlock = {
      ...widget.blocks[blockId],
      settings: {
        ...widget.blocks[blockId].settings,
        [settingId]: value,
      },
    };

    const updatedWidget = {
      ...widget,
      blocks: {
        ...widget.blocks,
        [blockId]: updatedBlock,
      },
    };

    const updatedPage = {
      ...page,
      widgets: {
        ...page.widgets,
        [widgetId]: updatedWidget,
      },
    };

    pageStore.setPage(updatedPage);
  },

  duplicateBlock: (widgetId, blockId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !page.widgets[widgetId]) return null;

    const widget = page.widgets[widgetId];
    const { schemas } = get();
    const widgetSchema = schemas[widget.type];
    if (hasReachedMaxBlocks(widget, widgetSchema)) return null;

    if (!widget.blocks || !widget.blocks[blockId]) return null;

    const originalBlock = widget.blocks[blockId];
    const newBlockId = get().generateBlockId();

    const newBlock = JSON.parse(JSON.stringify(originalBlock));

    const blockIndex = widget.blocksOrder.indexOf(blockId);
    const newBlocksOrder = [...(widget.blocksOrder || [])];

    if (blockIndex !== -1) {
      newBlocksOrder.splice(blockIndex + 1, 0, newBlockId);
    } else {
      newBlocksOrder.push(newBlockId);
    }

    const updatedWidget = {
      ...widget,
      blocks: {
        ...widget.blocks,
        [newBlockId]: newBlock,
      },
      blocksOrder: newBlocksOrder,
    };

    const updatedPage = {
      ...page,
      widgets: {
        ...page.widgets,
        [widgetId]: updatedWidget,
      },
    };

    pageStore.setPage(updatedPage);
    return newBlockId;
  },
}));

export default useWidgetStore;
