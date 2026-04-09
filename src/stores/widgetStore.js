import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { getProjectWidgets } from "../queries/previewManager";
import { getActiveProjectId } from "../lib/activeProjectId";
import usePageStore from "./pageStore";
import useAutoSave from "./saveStore";
import { hasReachedMaxBlocks } from "../utils/blockLimits";
import {
  insertIdAtPosition,
  insertIdAfter,
  removeIdFromOrder,
  getNextSelectedId,
  buildDefaultSettings,
  buildDefaultWidget,
  cloneBlock,
  cloneWidgetWithNewBlockIds,
} from "./widgetStoreHelpers";

export { hasReachedMaxBlocks };

// ---------------------------------------------------------------------------
// Widget data access helpers
// ---------------------------------------------------------------------------

/**
 * Check if a widgetId refers to a global widget (header or footer).
 */
function isGlobalWidgetId(widgetId) {
  return widgetId === "header" || widgetId === "footer";
}

/**
 * Get widget data regardless of whether it's a page widget or global widget.
 */
function getWidgetData(widgetId) {
  const pageStore = usePageStore.getState();
  if (isGlobalWidgetId(widgetId)) {
    return { widget: pageStore.globalWidgets[widgetId] || null, isGlobal: true };
  }
  const { page } = pageStore;
  return { widget: page?.widgets?.[widgetId] || null, isGlobal: false };
}

/**
 * Persist an updated widget back to the correct store location.
 */
function setWidgetData(widgetId, updatedWidget, isGlobal) {
  const pageStore = usePageStore.getState();
  if (isGlobal) {
    pageStore.updateGlobalWidget(widgetId, updatedWidget);
  } else {
    const { page } = pageStore;
    pageStore.setPage({
      ...page,
      widgets: {
        ...page.widgets,
        [widgetId]: updatedWidget,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Autosave signaling
// ---------------------------------------------------------------------------

function markStructureChanged() {
  useAutoSave.getState().setStructureModified(true);
}

function markWidgetContentChanged(widgetId, isGlobal) {
  if (isGlobal) {
    useAutoSave.getState().markWidgetModified(widgetId);
  } else {
    useAutoSave.getState().setStructureModified(true);
  }
}

// ---------------------------------------------------------------------------
// Selection state helpers
// ---------------------------------------------------------------------------

function getWidgetSelectionState(widgetId) {
  return {
    selectedWidgetId: widgetId,
    selectedBlockId: null,
    selectedGlobalWidgetId: null,
    selectedThemeGroup: null,
  };
}

function getGlobalWidgetSelectionState(widgetId) {
  return {
    selectedGlobalWidgetId: widgetId,
    selectedWidgetId: null,
    selectedBlockId: null,
    selectedThemeGroup: null,
  };
}

function getThemeGroupSelectionState(groupKey) {
  return {
    selectedThemeGroup: groupKey,
    selectedWidgetId: null,
    selectedBlockId: null,
    selectedGlobalWidgetId: null,
  };
}

function getClearedHoverState() {
  return { hoveredWidgetId: null, hoveredBlockId: null };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useWidgetStore = create((set, get) => ({
  // State
  schemas: {},
  selectedWidgetId: null,
  selectedBlockId: null,
  selectedGlobalWidgetId: null,
  selectedThemeGroup: null,
  hoveredWidgetId: null,
  hoveredBlockId: null,
  loadedProjectId: null,
  loading: false,
  error: null,

  // Actions
  loadSchemas: async () => {
    const projectId = getActiveProjectId();
    set({ loading: true, error: null, loadedProjectId: projectId, schemas: {} });
    try {
      const schemas = await getProjectWidgets();
      const schemasMap = {};
      schemas.forEach((schema) => {
        schemasMap[schema.type] = schema;
      });
      set({ schemas: schemasMap, loading: false, loadedProjectId: projectId });
    } catch (err) {
      set({ schemas: {}, error: err.message, loading: false, loadedProjectId: projectId });
      console.error("Failed to load widget schemas:", err);
    }
  },

  setSelectedWidgetId: (id) => set(getWidgetSelectionState(id)),
  setSelectedBlockId: (blockId) => set({ selectedBlockId: blockId }),
  setSelectedGlobalWidgetId: (id) => set(getGlobalWidgetSelectionState(id)),
  setSelectedThemeGroup: (groupKey) => set(getThemeGroupSelectionState(groupKey)),

  setHoveredWidget: (widgetId, blockId = null) => {
    set({ hoveredWidgetId: widgetId, hoveredBlockId: blockId });
  },

  resetSelection: () => {
    set({
      ...getWidgetSelectionState(null),
      ...getClearedHoverState(),
    });
  },

  resetForProjectChange: () => {
    set({
      schemas: {},
      ...getWidgetSelectionState(null),
      ...getClearedHoverState(),
      loadedProjectId: getActiveProjectId(),
      loading: false,
      error: null,
    });
  },

  generateWidgetId: () => `widget_${uuidv4()}`,
  generateBlockId: () => `block_${uuidv4()}`,

  // --- Widget CRUD ---

  addWidget: (widgetType, position) => {
    const { schemas } = get();
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !schemas[widgetType]) return null;

    const newWidgetId = get().generateWidgetId();
    const newWidget = buildDefaultWidget(schemas[widgetType], widgetType, () => get().generateBlockId());
    const currentOrder = page.widgetsOrder || Object.keys(page.widgets);

    pageStore.setPage({
      ...page,
      widgets: { ...page.widgets, [newWidgetId]: newWidget },
      widgetsOrder: insertIdAtPosition(currentOrder, newWidgetId, position),
    });

    set(getWidgetSelectionState(newWidgetId));
    markStructureChanged();
    return newWidgetId;
  },

  duplicateWidget: (widgetId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !page.widgets[widgetId]) return null;

    const newWidgetId = get().generateWidgetId();
    const newWidget = cloneWidgetWithNewBlockIds(page.widgets[widgetId], () => get().generateBlockId());
    const currentOrder = page.widgetsOrder || Object.keys(page.widgets);

    pageStore.setPage({
      ...page,
      widgets: { ...page.widgets, [newWidgetId]: newWidget },
      widgetsOrder: insertIdAfter(currentOrder, widgetId, newWidgetId),
    });

    set({ ...getWidgetSelectionState(newWidgetId), ...getClearedHoverState() });
    markStructureChanged();
    return newWidgetId;
  },

  deleteWidget: (widgetId) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    const { selectedWidgetId } = get();

    if (!page || !widgetId) return;

    const { [widgetId]: _, ...remainingWidgets } = page.widgets;
    const currentOrder = page.widgetsOrder || Object.keys(page.widgets);
    const newOrder = removeIdFromOrder(currentOrder, widgetId);

    pageStore.setPage({
      ...page,
      widgets: remainingWidgets,
      widgetsOrder: newOrder,
    });

    markStructureChanged();

    if (selectedWidgetId === widgetId) {
      const nextId = getNextSelectedId(currentOrder, widgetId);
      set({ selectedWidgetId: nextId, selectedBlockId: null, ...getClearedHoverState() });
    }
  },

  updateWidgetSettings: (widgetId, settingId, value) => {
    const pageStore = usePageStore.getState();
    const { page } = pageStore;
    if (!page || !widgetId || !page.widgets?.[widgetId]) return;

    pageStore.setPage({
      ...page,
      widgets: {
        ...page.widgets,
        [widgetId]: {
          ...page.widgets[widgetId],
          settings: {
            ...(page.widgets[widgetId].settings || {}),
            [settingId]: value,
          },
        },
      },
    });
  },

  updateGlobalWidgetSettings: (widgetType, settingId, value) => {
    const pageStore = usePageStore.getState();
    if (widgetType !== "header" && widgetType !== "footer") return;

    const currentWidget = pageStore.globalWidgets[widgetType];
    if (!currentWidget) return;

    pageStore.updateGlobalWidget(widgetType, {
      settings: { ...currentWidget.settings, [settingId]: value },
    });
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

    pageStore.setPage({ ...page, widgets: reorderedWidgets, widgetsOrder: newOrder });
    markStructureChanged();
  },

  // --- Block CRUD ---

  addBlock: (widgetId, blockType, position = null) => {
    const { schemas } = get();
    const { widget, isGlobal } = getWidgetData(widgetId);
    if (!widget) return null;

    const widgetSchema = schemas[widget.type];
    if (hasReachedMaxBlocks(widget, widgetSchema)) return null;

    const blockSchema = widgetSchema.blocks?.find((b) => b.type === blockType);
    if (!blockSchema) return null;

    const blockId = get().generateBlockId();
    const newBlock = { type: blockType, settings: buildDefaultSettings(blockSchema.settings) };
    const currentOrder = widget.blocksOrder || [];

    const newOrder =
      position === null || position === "add" || position >= currentOrder.length
        ? [...currentOrder, blockId]
        : insertIdAtPosition(currentOrder, blockId, position);

    setWidgetData(
      widgetId,
      {
        ...widget,
        blocks: { ...(widget.blocks || {}), [blockId]: newBlock },
        blocksOrder: newOrder,
      },
      isGlobal,
    );

    return blockId;
  },

  duplicateBlock: (widgetId, blockId) => {
    const { widget, isGlobal } = getWidgetData(widgetId);
    if (!widget || !widget.blocks?.[blockId]) return null;

    const { schemas } = get();
    if (hasReachedMaxBlocks(widget, schemas[widget.type])) return null;

    const newBlockId = get().generateBlockId();
    const newBlock = cloneBlock(widget.blocks[blockId]);

    setWidgetData(
      widgetId,
      {
        ...widget,
        blocks: { ...widget.blocks, [newBlockId]: newBlock },
        blocksOrder: insertIdAfter(widget.blocksOrder || [], blockId, newBlockId),
      },
      isGlobal,
    );

    return newBlockId;
  },

  deleteBlock: (widgetId, blockId) => {
    const { selectedBlockId } = get();
    const { widget, isGlobal } = getWidgetData(widgetId);
    if (!widget) return;

    const currentOrder = widget.blocksOrder || [];
    const { [blockId]: _, ...remainingBlocks } = widget.blocks || {};

    setWidgetData(
      widgetId,
      {
        ...widget,
        blocks: remainingBlocks,
        blocksOrder: removeIdFromOrder(currentOrder, blockId),
      },
      isGlobal,
    );

    if (selectedBlockId === blockId) {
      const nextId = getNextSelectedId(currentOrder, blockId);
      set({ selectedBlockId: nextId, hoveredBlockId: null });
    }
  },

  reorderBlocks: (widgetId, newOrder) => {
    const { widget, isGlobal } = getWidgetData(widgetId);
    if (!widget) return;

    setWidgetData(widgetId, { ...widget, blocksOrder: newOrder }, isGlobal);
    markWidgetContentChanged(widgetId, isGlobal);
  },

  updateBlockSettings: (widgetId, blockId, settingId, value) => {
    const { widget, isGlobal } = getWidgetData(widgetId);
    if (!widget || !widget.blocks?.[blockId]) return;

    setWidgetData(
      widgetId,
      {
        ...widget,
        blocks: {
          ...widget.blocks,
          [blockId]: {
            ...widget.blocks[blockId],
            settings: {
              ...widget.blocks[blockId].settings,
              [settingId]: value,
            },
          },
        },
      },
      isGlobal,
    );
  },
}));

export default useWidgetStore;
