import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import WidgetInsertionZone from "./WidgetInsertionZone";
import SortableWidgetItem from "./widgets/SortableWidgetItem";
import FixedWidgetItem from "./widgets/FixedWidgetItem";
import WidgetItem from "./widgets/WidgetItem";
import WidgetSection from "./widgets/WidgetSection";
import usePageStore from "../../stores/pageStore";
import useWidgetStore from "../../stores/widgetStore";
import useAutoSave from "../../stores/saveStore";
import { scrollElementIntoView } from "../../queries/previewManager";
import WidgetSelector from "./WidgetSelector";
import BlockSelector from "./blocks/BlockSelector";

export default function WidgetList({
  page,
  widgets,
  widgetSchemas,
  selectedWidgetId,
  selectedBlockId,
  selectedGlobalWidgetId,
  modifiedWidgets = new Set(),
  onWidgetSelect,
  onBlockSelect,
  onGlobalWidgetSelect,
  previewIframeRef, // Need this for scroll coordination
}) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(null);

  // WidgetSelector modal state
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState(0);
  const [widgetTriggerRef, setWidgetTriggerRef] = useState(null);
  const [activeWidgetTriggerPosition, setActiveWidgetTriggerPosition] = useState(null);

  // BlockSelector modal state
  const [isBlockSelectorOpen, setIsBlockSelectorOpen] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState(null);
  const [blockTriggerRef, setBlockTriggerRef] = useState(null);
  const [activeBlockTriggerKey, setActiveBlockTriggerKey] = useState(null);
  const [blockInsertPosition, setBlockInsertPosition] = useState(null);

  const { globalWidgets } = usePageStore();
  const { deleteWidget, duplicateWidget, reorderWidgets, reorderBlocks, setHoveredWidget, updateWidgetSettings } =
    useWidgetStore();
  const { setStructureModified } = useAutoSave();
  const { header: headerWidget, footer: footerWidget } = globalWidgets;

  // Handle widget/block hover from sidebar - now uses store state for overlay
  const handleHover = (widgetId, blockId) => {
    setHoveredWidget(widgetId, blockId);
  };

  const sortableWidgets = (page.widgetsOrder || []).map((widgetId) => ({
    id: widgetId,
    ...(widgets[widgetId] || {}),
  }));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event) => {
    const draggedId = event.active.id;
    setActiveId(draggedId);

    if (selectedWidgetId !== draggedId && onWidgetSelect) {
      onWidgetSelect(draggedId);
    }
  };

  const handleDragEnd = (event) => {
    setActiveId(null);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldWidgetIds = sortableWidgets.map((item) => item.id);
      const oldIndex = oldWidgetIds.indexOf(active.id);
      const newIndex = oldWidgetIds.indexOf(over.id);
      const newOrder = arrayMove(oldWidgetIds, oldIndex, newIndex);

      reorderWidgets(newOrder);
      setStructureModified(true);
      if (previewIframeRef?.current) {
        scrollElementIntoView(previewIframeRef.current, active.id, null);
      }
    }
  };

  // Handle widget deletion
  const handleDeleteWidget = (widgetId) => {
    if (!page || !page.widgets[widgetId]) return;
    deleteWidget(widgetId);
    setStructureModified(true);
  };

  // Handle widget duplication
  const handleDuplicateWidget = (widgetId) => {
    duplicateWidget(widgetId);
    setStructureModified(true);
  };

  // Handle widget rename
  const handleRenameWidget = (widgetId, newName) => {
    updateWidgetSettings(widgetId, "name", newName);
  };

  // Handle opening widget selector
  const handleAddWidgetClick = (position, triggerRef) => {
    setInsertPosition(position);
    setWidgetTriggerRef(triggerRef);
    setActiveWidgetTriggerPosition(position);
    setIsWidgetSelectorOpen(true);
  };

  // Handle opening block selector
  const handleAddBlockClick = (widgetId, triggerRef, position = null) => {
    // Check if widget has only one block type available
    const widget = widgets[widgetId] || (page?.widgets && page.widgets[widgetId]);
    const schema = widget && widgetSchemas[widget.type];

    if (schema && schema.blocks && schema.blocks.length === 1) {
      // Direct add
      const blockType = schema.blocks[0].type;

      const { addBlock, setSelectedWidgetId, setSelectedBlockId } = useWidgetStore.getState();
      const newBlockId = addBlock(widgetId, blockType, position);
      setStructureModified(true);

      // Keep the widget selected and select the new block
      setSelectedWidgetId(widgetId);
      setSelectedBlockId(newBlockId);
      return;
    }

    setActiveWidgetId(widgetId);
    setBlockTriggerRef(triggerRef);
    const triggerKey = position !== null ? `${widgetId}-${position}` : `${widgetId}-add`;
    setActiveBlockTriggerKey(triggerKey);
    setBlockInsertPosition(position);
    setIsBlockSelectorOpen(true);
  };

  // Scroll selected widget into view in sidebar (without scrolling main page)
  useEffect(() => {
    const targetId = selectedWidgetId || selectedGlobalWidgetId;
    if (targetId) {
      const el = document.getElementById(`sidebar-widget-${targetId}`);
      if (el) {
        // Find the scrollable sidebar container
        const scrollContainer = el.closest(".overflow-y-auto");
        if (scrollContainer) {
          // Calculate scroll position within container
          const containerRect = scrollContainer.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const elTop = elRect.top - containerRect.top + scrollContainer.scrollTop;
          const elCenter = elTop - containerRect.height / 2 + elRect.height / 2;

          scrollContainer.scrollTo({
            top: Math.max(0, elCenter),
            behavior: "smooth",
          });
        }
      }
    }
  }, [selectedWidgetId, selectedGlobalWidgetId]);

  const activeWidget = activeId ? sortableWidgets.find((item) => item.id === activeId) : null;
  const activeWidgetSchema = activeWidget ? widgetSchemas[activeWidget.type] || {} : {};

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto flex-grow p-3">
        {headerWidget && (
          <WidgetSection>
            <div id="sidebar-widget-header">
              <FixedWidgetItem
                widgetId="header"
                widget={headerWidget}
                widgetSchema={widgetSchemas[headerWidget.type] || {}}
                isSelected={selectedGlobalWidgetId === "header"}
                isModified={modifiedWidgets.has("header")}
                onWidgetSelect={() => onGlobalWidgetSelect && onGlobalWidgetSelect("header")}
                onHover={handleHover}
              />
            </div>
          </WidgetSection>
        )}

        {headerWidget && <div className="my-4 border-t border-slate-200" />}

        {sortableWidgets.length > 0 ? (
          <WidgetSection>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={sortableWidgets.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0">
                  <WidgetInsertionZone
                    position={0}
                    onAddClick={handleAddWidgetClick}
                    isWidgetSelectorOpen={isWidgetSelectorOpen}
                    activeWidgetTriggerPosition={activeWidgetTriggerPosition}
                  />

                  {sortableWidgets.map((widget, index) => {
                    const widgetId = widget.id;
                    const widgetSchema = widgetSchemas[widget.type] || {};
                    const isModified = modifiedWidgets.has(widgetId);

                    return (
                      <div key={widgetId} id={`sidebar-widget-${widgetId}`}>
                        <SortableWidgetItem
                          widgetId={widgetId}
                          widget={widget}
                          widgetSchema={widgetSchema}
                          isSelected={selectedWidgetId === widgetId}
                          isModified={isModified}
                          isDraggingAny={activeId !== null}
                          onWidgetSelect={onWidgetSelect}
                          onDeleteClick={handleDeleteWidget}
                          onDuplicateClick={handleDuplicateWidget}
                          selectedBlockId={selectedBlockId}
                          onBlockSelect={onBlockSelect}
                          onBlocksReorder={reorderBlocks}
                          onAddBlockClick={handleAddBlockClick}
                          isBlockSelectorOpen={isBlockSelectorOpen}
                          activeWidgetId={activeWidgetId}
                          activeBlockTriggerKey={activeBlockTriggerKey}
                          onHover={handleHover}
                          onRenameWidget={handleRenameWidget}
                        />
                        {index < sortableWidgets.length - 1 && (
                          <WidgetInsertionZone
                            position={index + 1}
                            onAddClick={handleAddWidgetClick}
                            isWidgetSelectorOpen={isWidgetSelectorOpen}
                            activeWidgetTriggerPosition={activeWidgetTriggerPosition}
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-2">
                    <button
                      className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const triggerRef = { current: e.currentTarget };
                        handleAddWidgetClick(sortableWidgets.length, triggerRef);
                      }}
                    >
                      <Plus size={12} />
                      <span>{t("pageEditor.actions.addWidget")}</span>
                    </button>
                  </div>
                </div>
              </SortableContext>

              <DragOverlay adjustScale={false}>
                {activeId && activeWidget ? (
                  <div className="w-full">
                    <WidgetItem
                      widgetId={activeId}
                      widget={activeWidget}
                      widgetSchema={activeWidgetSchema}
                      isSelected={true}
                      isModified={modifiedWidgets.has(activeId)}
                      isOverlay={true}
                      isDraggingAny={true}
                      onDeleteClick={handleDeleteWidget}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </WidgetSection>
        ) : (
          <div className="text-center py-8 px-4 border border-dashed border-slate-300 rounded-md">
            <button
              ref={(ref) => {
                if (ref) {
                  ref.triggerRef = { current: ref };
                }
              }}
              onClick={(e) => {
                const triggerRef = { current: e.currentTarget };
                handleAddWidgetClick(0, triggerRef);
              }}
              className="flex items-center justify-center w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 py-2 rounded-md"
            >
              <Plus size={16} className="mr-2" />
              <span className="text-sm font-medium">{t("pageEditor.actions.addWidget")}</span>
            </button>
          </div>
        )}

        {footerWidget && <div className="my-4 border-t border-slate-200" />}

        {footerWidget && (
          <WidgetSection>
            <div id="sidebar-widget-footer">
              <FixedWidgetItem
                widgetId="footer"
                widget={footerWidget}
                widgetSchema={widgetSchemas[footerWidget.type] || {}}
                isSelected={selectedGlobalWidgetId === "footer"}
                isModified={modifiedWidgets.has("footer")}
                onWidgetSelect={() => onGlobalWidgetSelect && onGlobalWidgetSelect("footer")}
                onHover={handleHover}
              />
            </div>
          </WidgetSection>
        )}
      </div>

      <WidgetSelector
        isOpen={isWidgetSelectorOpen}
        onClose={() => {
          setIsWidgetSelectorOpen(false);
          setWidgetTriggerRef(null);
          setActiveWidgetTriggerPosition(null);
        }}
        widgetSchemas={widgetSchemas}
        onSelectWidget={(type, position) => {
          const { addWidget } = useWidgetStore.getState();
          addWidget(type, position);
          setStructureModified(true);
        }}
        position={insertPosition}
        triggerRef={widgetTriggerRef}
      />

      <BlockSelector
        isOpen={isBlockSelectorOpen}
        onClose={() => {
          setIsBlockSelectorOpen(false);
          setActiveWidgetId(null);
          setBlockTriggerRef(null);
          setActiveBlockTriggerKey(null);
          setBlockInsertPosition(null);
        }}
        widgetSchema={activeWidgetId ? widgetSchemas[page?.widgets[activeWidgetId]?.type] : null}
        onSelectBlock={(blockType) => {
          if (activeWidgetId) {
            const { addBlock, setSelectedWidgetId, setSelectedBlockId } = useWidgetStore.getState();
            const newBlockId = addBlock(activeWidgetId, blockType, blockInsertPosition);
            setStructureModified(true);

            // Keep the widget selected and select the new block
            setSelectedWidgetId(activeWidgetId);
            setSelectedBlockId(newBlockId);
          }
          setIsBlockSelectorOpen(false);
          setActiveWidgetId(null);
          setBlockInsertPosition(null);
        }}
        triggerRef={blockTriggerRef}
      />
    </div>
  );
}
