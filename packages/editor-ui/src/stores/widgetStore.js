import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { getProjectWidgets } from "../queries/previewManager";
import { getActiveProjectId } from "../lib/activeProjectId";
import usePageStore from "./pageStore";
import useAutoSave from "./saveStore";
import { hasReachedMaxBlocks } from "@widgetizer/core/blockLimits";
import { AREA_UNSUPPORTED_WIDGET_TYPES } from "@widgetizer/core/sharedAreas";
import {
  insertIdAtPosition,
  insertIdAfter,
  removeIdFromOrder,
  getNextSelectedId,
  buildDefaultSettings,
  buildDefaultWidget,
  cloneBlock,
  cloneWidgetWithNewBlockIds,
  withoutListingFlags,
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
 * Where a widget lives: the header or footer, the page, or a shared area. Widget
 * ids are unique across the page and its areas, so the id alone says which.
 * @returns {{ type: "global" } | { type: "page" } | { type: "area", areaId: string } | null}
 */
export function findWidgetOwner(widgetId) {
  if (isGlobalWidgetId(widgetId)) return { type: "global" };
  const { page, sharedAreas } = usePageStore.getState();
  if (page?.widgets?.[widgetId]) return { type: "page" };
  for (const [areaId, area] of Object.entries(sharedAreas || {})) {
    if (area?.widgets?.[widgetId]) return { type: "area", areaId };
  }
  return null;
}

/** The owner a list action works on: the page, or the named shared area. */
const listOwner = (areaId) => (areaId ? { type: "area", areaId } : { type: "page" });

/** The ordered widget list of the page or of an area. */
function readList(owner) {
  const { page, sharedAreas } = usePageStore.getState();
  const holder = owner?.type === "area" ? sharedAreas?.[owner.areaId] : page;
  if (!holder) return null;
  return { widgets: holder.widgets || {}, widgetsOrder: holder.widgetsOrder || Object.keys(holder.widgets || {}) };
}

function writeList(owner, { widgets, widgetsOrder }) {
  const pageStore = usePageStore.getState();
  if (owner.type === "area") pageStore.setSharedArea(owner.areaId, { widgets, widgetsOrder });
  else pageStore.setPage({ ...pageStore.page, widgets, widgetsOrder });
}

/**
 * Get widget data wherever it lives: header/footer, page, or a shared area.
 */
function getWidgetData(widgetId) {
  const owner = findWidgetOwner(widgetId);
  if (!owner) return { widget: null, owner: null };
  if (owner.type === "global") return { widget: usePageStore.getState().globalWidgets[widgetId] || null, owner };
  return { widget: readList(owner)?.widgets?.[widgetId] || null, owner };
}

/**
 * Persist an updated widget back to where it lives.
 */
function setWidgetData(widgetId, updatedWidget, owner) {
  if (owner.type === "global") {
    usePageStore.getState().updateGlobalWidget(widgetId, updatedWidget);
    return;
  }
  const list = readList(owner);
  writeList(owner, { ...list, widgets: { ...list.widgets, [widgetId]: updatedWidget } });
}

// ---------------------------------------------------------------------------
// Autosave signaling
// ---------------------------------------------------------------------------

/** The modified-widgets key an area's edits are recorded under. */
export const areaModifiedKey = (areaId) => `area:${areaId}`;

function markStructureChanged(owner = { type: "page" }) {
  if (owner.type === "area") useAutoSave.getState().markWidgetModified(areaModifiedKey(owner.areaId));
  else useAutoSave.getState().setStructureModified(true);
}

function markWidgetContentChanged(widgetId, owner) {
  if (owner.type === "global") {
    useAutoSave.getState().markWidgetModified(widgetId);
  } else {
    markStructureChanged(owner);
  }
}

/**
 * Record a content edit to a widget (its settings or blocks) against its owner: a
 * shared area's widget dirties that area, any other widget is tracked by its id.
 */
export function markWidgetChanged(widgetId) {
  const owner = findWidgetOwner(widgetId);
  if (owner?.type === "area") useAutoSave.getState().markWidgetModified(areaModifiedKey(owner.areaId));
  else useAutoSave.getState().markWidgetModified(widgetId);
}

/** A widget type a shared area cannot hold (a form, for now). */
export const isAreaUnsupportedType = (type) => AREA_UNSUPPORTED_WIDGET_TYPES.has(type);

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
  loadedLanguage: "",
  activeLoadId: 0,
  loading: false,
  error: null,
  widgetClipboard: null,

  // Actions
  // Keyed by language as well as project: a schema's defaults can differ
  // between them, and adding or removing a language keeps the same project id.
  // A load that is overtaken writes nothing back — neither its schemas nor its
  // failure — or a slow request for the language just left would replace the
  // one the editor is now showing.
  loadSchemas: async (language = "") => {
    const projectId = getActiveProjectId();
    const loadId = get().activeLoadId + 1;
    set({ activeLoadId: loadId, loading: true, error: null, loadedProjectId: projectId, loadedLanguage: language, schemas: {} });
    try {
      const schemas = await getProjectWidgets(language);
      if (get().activeLoadId !== loadId) return;
      const schemasMap = {};
      schemas.forEach((schema) => {
        schemasMap[schema.type] = schema;
      });
      set({ schemas: schemasMap, loading: false, loadedProjectId: projectId, loadedLanguage: language });
    } catch (err) {
      if (get().activeLoadId !== loadId) return;
      set({ schemas: {}, error: err.message, loading: false, loadedProjectId: projectId, loadedLanguage: language });
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
      widgetClipboard: null,
    });
  },

  generateWidgetId: () => `widget_${uuidv4()}`,
  generateBlockId: () => `block_${uuidv4()}`,

  // --- Widget CRUD ---

  // `areaId` adds to that shared area instead of the page.
  addWidget: (widgetType, position, areaId = null) => {
    const { schemas } = get();
    const owner = listOwner(areaId);
    const list = readList(owner);

    if (!list || !schemas[widgetType]) return null;
    if (areaId && isAreaUnsupportedType(widgetType)) return null;

    const newWidgetId = get().generateWidgetId();
    const newWidget = buildDefaultWidget(schemas[widgetType], widgetType, () => get().generateBlockId());

    writeList(owner, {
      widgets: { ...list.widgets, [newWidgetId]: newWidget },
      widgetsOrder: insertIdAtPosition(list.widgetsOrder, newWidgetId, position),
    });

    set(getWidgetSelectionState(newWidgetId));
    markStructureChanged(owner);
    return newWidgetId;
  },

  duplicateWidget: (widgetId) => {
    const { widget, owner } = getWidgetData(widgetId);
    if (!widget || owner.type === "global") return null;
    const list = readList(owner);

    const newWidgetId = get().generateWidgetId();
    const newWidget = withoutListingFlags(cloneWidgetWithNewBlockIds(widget, () => get().generateBlockId()));

    writeList(owner, {
      widgets: { ...list.widgets, [newWidgetId]: newWidget },
      widgetsOrder: insertIdAfter(list.widgetsOrder, widgetId, newWidgetId),
    });

    set({ ...getWidgetSelectionState(newWidgetId), ...getClearedHoverState() });
    markStructureChanged(owner);
    return newWidgetId;
  },

  copyWidget: (widgetId) => {
    // Page and area widgets — the header and footer are singletons, not copyable.
    const { widget, owner } = getWidgetData(widgetId);
    if (!widget || owner.type === "global") return false;

    set({ widgetClipboard: JSON.parse(JSON.stringify(widget)) });
    return true;
  },

  // `areaId` pastes into that shared area. The copy never takes a page-only listing
  // role, and an area refuses a widget it cannot hold (returns null).
  pasteWidget: (position, areaId = null) => {
    const { widgetClipboard } = get();
    if (!widgetClipboard) return null;

    const owner = listOwner(areaId);
    const list = readList(owner);
    if (!list) return null;
    if (areaId && isAreaUnsupportedType(widgetClipboard.type)) return null;

    const newWidgetId = get().generateWidgetId();
    const newWidget = withoutListingFlags(cloneWidgetWithNewBlockIds(widgetClipboard, () => get().generateBlockId()));

    writeList(owner, {
      widgets: { ...list.widgets, [newWidgetId]: newWidget },
      widgetsOrder: insertIdAtPosition(list.widgetsOrder, newWidgetId, position),
    });

    set({ ...getWidgetSelectionState(newWidgetId), ...getClearedHoverState() });
    markStructureChanged(owner);
    return newWidgetId;
  },

  deleteWidget: (widgetId) => {
    const { selectedWidgetId } = get();
    const owner = widgetId ? findWidgetOwner(widgetId) : null;
    if (!owner || owner.type === "global") return;
    const list = readList(owner);

    const { [widgetId]: _, ...remainingWidgets } = list.widgets;
    writeList(owner, { widgets: remainingWidgets, widgetsOrder: removeIdFromOrder(list.widgetsOrder, widgetId) });

    markStructureChanged(owner);

    if (selectedWidgetId === widgetId) {
      const nextId = getNextSelectedId(list.widgetsOrder, widgetId);
      set({ selectedWidgetId: nextId, selectedBlockId: null, ...getClearedHoverState() });
    }
  },

  updateWidgetSettings: (widgetId, settingId, value) => get().updateWidgetSettingValues(widgetId, { [settingId]: value }),

  updateWidgetSettingValues: (widgetId, values) => {
    if (!widgetId) return;
    const { widget, owner } = getWidgetData(widgetId);
    if (!widget || owner.type === "global") return;

    setWidgetData(widgetId, { ...widget, settings: { ...(widget.settings || {}), ...values } }, owner);
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

  // `areaId` reorders that shared area; a widget never moves between owners here.
  reorderWidgets: (newOrder, areaId = null) => {
    const owner = listOwner(areaId);
    const list = readList(owner);
    if (!list) return;

    const reorderedWidgets = {};
    newOrder.forEach((widgetId) => {
      if (list.widgets[widgetId]) {
        reorderedWidgets[widgetId] = list.widgets[widgetId];
      }
    });

    writeList(owner, { widgets: reorderedWidgets, widgetsOrder: newOrder });
    markStructureChanged(owner);
  },

  // --- Block CRUD ---

  addBlock: (widgetId, blockType, position = null) => {
    const { schemas } = get();
    const { widget, owner } = getWidgetData(widgetId);
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
      owner,
    );

    return blockId;
  },

  duplicateBlock: (widgetId, blockId) => {
    const { widget, owner } = getWidgetData(widgetId);
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
      owner,
    );

    return newBlockId;
  },

  deleteBlock: (widgetId, blockId) => {
    const { selectedBlockId } = get();
    const { widget, owner } = getWidgetData(widgetId);
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
      owner,
    );

    if (selectedBlockId === blockId) {
      const nextId = getNextSelectedId(currentOrder, blockId);
      set({ selectedBlockId: nextId, hoveredBlockId: null });
    }
  },

  reorderBlocks: (widgetId, newOrder) => {
    const { widget, owner } = getWidgetData(widgetId);
    if (!widget) return;

    setWidgetData(widgetId, { ...widget, blocksOrder: newOrder }, owner);
    markWidgetContentChanged(widgetId, owner);
  },

  updateBlockSettings: (widgetId, blockId, settingId, value) => {
    const { widget, owner } = getWidgetData(widgetId);
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
      owner,
    );
  },
}));

export default useWidgetStore;
