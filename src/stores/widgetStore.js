import { create } from "zustand";
import { getProjectWidgets } from "../utils/previewManager";
import usePageStore from "./pageStore";
import useAutoSave from "./saveStore";

const useWidgetStore = create((set, get) => ({
  // State
  schemas: {},
  selectedWidgetId: null,
  selectedBlockId: null,
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
    });
  },

  setSelectedBlockId: (blockId) => {
    set({ selectedBlockId: blockId });
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

    // Get the current order, preserving header/footer
    const currentOrder = page.widgetsOrder || Object.keys(page.widgets);

    // Find the header and footer indices
    const headerIndex = currentOrder.findIndex((id) => page.widgets[id]?.type === "header");
    const footerIndex = currentOrder.findIndex((id) => page.widgets[id]?.type === "footer");

    // Get the content widgets (excluding header/footer)
    const contentWidgets = currentOrder.filter(
      (id) => page.widgets[id]?.type !== "header" && page.widgets[id]?.type !== "footer",
    );

    // Calculate the actual insertion index
    let actualInsertIndex;
    if (position >= contentWidgets.length) {
      // Insert at the end (before footer)
      actualInsertIndex = footerIndex !== -1 ? footerIndex : currentOrder.length;
    } else {
      // Insert at the specified position among content widgets
      const targetWidgetId = contentWidgets[position];
      actualInsertIndex = currentOrder.indexOf(targetWidgetId);
    }

    // Create the new order by inserting the new widget
    const newWidgetsOrder = [
      ...currentOrder.slice(0, actualInsertIndex),
      newWidgetId,
      ...currentOrder.slice(actualInsertIndex),
    ];

    // Update the page state
    pageStore.setPage({
      ...page,
      widgets: {
        ...page.widgets,
        [newWidgetId]: newWidget,
      },
      widgetsOrder: newWidgetsOrder,
    });

    set({ selectedWidgetId: newWidgetId });
    // Mark structure as modified for auto-save
    useAutoSave.getState().setStructureModified(true);
    return newWidgetId;
  },

  duplicateWidget: (widgetId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !page.widgets[widgetId]) return null;

    const originalWidget = page.widgets[widgetId];

    // Generate new IDs for blocks
    const newBlocks = {};
    const newBlocksOrder = [];

    // Duplicate blocks with new IDs
    if (originalWidget.blocks) {
      originalWidget.blocksOrder?.forEach((oldBlockId) => {
        const newBlockId = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        newBlocks[newBlockId] = { ...originalWidget.blocks[oldBlockId] };
        newBlocksOrder.push(newBlockId);
      });
    }

    // Create new widget with new ID
    const newWidgetId = get().generateWidgetId();
    const newWidget = {
      ...JSON.parse(JSON.stringify(originalWidget)),
      blocks: newBlocks,
      blocksOrder: newBlocksOrder,
    };

    // Find the position of the original widget in the order
    const currentOrder =
      page.widgetsOrder || Object.keys(page.widgets).filter((id) => id !== "header_widget" && id !== "footer_widget");
    const originalIndex = currentOrder.indexOf(widgetId);

    // Create the new order by inserting the new ID after the original
    const newWidgetsOrder = [
      ...currentOrder.slice(0, originalIndex + 1),
      newWidgetId,
      ...currentOrder.slice(originalIndex + 1),
    ];

    // Update the page state
    pageStore.setPage({
      ...page,
      widgets: {
        ...page.widgets,
        [newWidgetId]: newWidget,
      },
      widgetsOrder: newWidgetsOrder, // Set the new top-level order array
    });

    // Mark structure as modified for auto-save
    useAutoSave.getState().setStructureModified(true);

    set({ selectedWidgetId: newWidgetId });
    return newWidgetId;
  },

  deleteWidget: (widgetId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    const { selectedWidgetId } = get();

    if (!page || !widgetId) return;

    const { [widgetId]: deletedWidget, ...remainingWidgets } = page.widgets;

    // Calculate the new widgetsOrder by filtering out the deleted ID
    const currentOrder =
      page.widgetsOrder || Object.keys(page.widgets).filter((id) => id !== "header_widget" && id !== "footer_widget");
    const newWidgetsOrder = currentOrder.filter((id) => id !== widgetId);

    // Update the page state
    pageStore.setPage({
      ...page,
      widgets: remainingWidgets,
      widgetsOrder: newWidgetsOrder, // Set the new top-level order array
    });

    // Mark structure as modified for auto-save
    useAutoSave.getState().setStructureModified(true);

    // Update selection if the deleted widget was selected
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

  reorderWidgets: (newOrder) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page) return;

    // Create the reordered widgets object
    const reorderedWidgets = {};
    newOrder.forEach((widgetId) => {
      if (page.widgets[widgetId]) {
        reorderedWidgets[widgetId] = page.widgets[widgetId];
      }
    });

    // Update the page state with the reordered widgets object
    // and the new widgetsOrder array
    pageStore.setPage({
      ...page,
      widgets: reorderedWidgets, // Use the reordered widgets object
      widgetsOrder: newOrder, // Set the new order array
    });

    // Mark structure as modified for auto-save
    useAutoSave.getState().setStructureModified(true);
  },

  addBlock: (widgetId, blockType) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    const { schemas } = get();

    if (!page || !page.widgets[widgetId]) return null;

    const widget = page.widgets[widgetId];
    const widgetSchema = schemas[widget.type];
    const blockSchema = widgetSchema.blocks?.find((block) => block.type === blockType);

    if (!blockSchema) return null;

    // Generate block ID
    const blockId = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Create default settings for the block
    const defaultSettings = {};
    if (Array.isArray(blockSchema.settings)) {
      blockSchema.settings.forEach((setting) => {
        defaultSettings[setting.id] = setting.default;
      });
    }

    // Create new block
    const newBlock = {
      type: blockType,
      settings: defaultSettings,
    };

    // Update widget with new block
    const updatedWidget = {
      ...widget,
      blocks: {
        ...(widget.blocks || {}),
        [blockId]: newBlock,
      },
      blocksOrder: [...(widget.blocksOrder || []), blockId], // Ensure blocksOrder is initialized
    };

    // Update page
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

    // Create a deep copy of the block
    const newBlock = JSON.parse(JSON.stringify(originalBlock));

    // Find the position of the original block
    const blockIndex = widget.blocksOrder.indexOf(blockId);
    const newBlocksOrder = [...(widget.blocksOrder || [])];

    // Insert new block after the original
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
