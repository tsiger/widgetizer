import { create } from "zustand";
import { getProjectWidgets } from "../queries/previewManager";
import usePageStore from "./pageStore";
import useAutoSave from "./saveStore";

const useWidgetStore = create((set, get) => ({
  // State
  schemas: {},
  selectedWidgetId: null,
  selectedBlockId: null,
  selectedGlobalWidgetId: null,
  selectedThemeGroup: null,
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

  generateWidgetId: () => {
    return `widget_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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

    const newWidgetId = get().generateWidgetId();
    const newWidget = {
      type: widgetType,
      settings: defaultSettings,
      blocks: {},
      blocksOrder: [],
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

    set({ selectedWidgetId: newWidgetId });
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
        const newBlockId = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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

    // Select the new widget and mark changes for auto-save
    set({ selectedWidgetId: newWidgetId, selectedBlockId: null });
    useAutoSave.getState().setStructureModified(true);

    return newWidgetId;
  },

  deleteWidget: (widgetId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    const { selectedWidgetId } = get();

    if (!page || !widgetId) return;

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
      const widgetIds = Object.keys(remainingWidgets);
      if (widgetIds.length > 0) {
        const deletedIndex = Object.keys(page.widgets).indexOf(widgetId);
        const nextIndex = Math.min(deletedIndex, widgetIds.length - 1);
        set({ selectedWidgetId: widgetIds[nextIndex] });
      } else {
        set({ selectedWidgetId: null });
      }
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
    const blockSchema = widgetSchema.blocks?.find((block) => block.type === blockType);

    if (!blockSchema) return null;

    const blockId = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

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
    if (!widget.blocks || !widget.blocks[blockId]) return null;

    const originalBlock = widget.blocks[blockId];
    const newBlockId = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

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
