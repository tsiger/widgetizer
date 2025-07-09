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
import { useState } from "react";
import { Plus } from "lucide-react";
import WidgetInsertionZone from "./WidgetInsertionZone";
import SortableWidgetItem from "./widgets/SortableWidgetItem";
import FixedWidgetItem from "./widgets/FixedWidgetItem";
import WidgetItem from "./widgets/WidgetItem";
import WidgetSection from "./widgets/WidgetSection";
import usePageStore from "../../stores/pageStore";

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
  onWidgetsReorder,
  onBlocksReorder,
  onDeleteWidget,
  onDuplicateWidget,
  onAddWidgetClick,
  onAddBlockClick,
  isWidgetSelectorOpen,
  activeWidgetTriggerPosition,
  isBlockSelectorOpen,
  activeWidgetId,
  activeBlockTriggerKey,
}) {
  const [activeId, setActiveId] = useState(null);

  const { globalWidgets } = usePageStore();
  const { header: headerWidget, footer: footerWidget } = globalWidgets;

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

      if (onWidgetsReorder) {
        onWidgetsReorder(newOrder, active.id);
      }
    }
  };

  const activeWidget = activeId ? sortableWidgets.find((item) => item.id === activeId) : null;
  const activeWidgetSchema = activeWidget ? widgetSchemas[activeWidget.type] || {} : {};

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto flex-grow p-3">
        {headerWidget && (
          <WidgetSection>
            <FixedWidgetItem
              widgetId="header"
              widget={headerWidget}
              widgetSchema={widgetSchemas[headerWidget.type] || {}}
              isSelected={selectedGlobalWidgetId === "header"}
              isModified={modifiedWidgets.has("header")}
              onWidgetSelect={() => onGlobalWidgetSelect && onGlobalWidgetSelect("header")}
            />
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
                    onAddClick={onAddWidgetClick}
                    isWidgetSelectorOpen={isWidgetSelectorOpen}
                    activeWidgetTriggerPosition={activeWidgetTriggerPosition}
                  />

                  {sortableWidgets.map((widget, index) => {
                    const widgetId = widget.id;
                    const widgetSchema = widgetSchemas[widget.type] || {};
                    const isModified = modifiedWidgets.has(widgetId);

                    return (
                      <div key={widgetId}>
                        <SortableWidgetItem
                          widgetId={widgetId}
                          widget={widget}
                          widgetSchema={widgetSchema}
                          isSelected={selectedWidgetId === widgetId}
                          isModified={isModified}
                          onWidgetSelect={onWidgetSelect}
                          onDeleteClick={onDeleteWidget}
                          onDuplicateClick={onDuplicateWidget}
                          selectedBlockId={selectedBlockId}
                          onBlockSelect={onBlockSelect}
                          onBlocksReorder={onBlocksReorder}
                          onAddBlockClick={onAddBlockClick}
                          isBlockSelectorOpen={isBlockSelectorOpen}
                          activeWidgetId={activeWidgetId}
                          activeBlockTriggerKey={activeBlockTriggerKey}
                        />
                        <WidgetInsertionZone
                          position={index + 1}
                          onAddClick={onAddWidgetClick}
                          isWidgetSelectorOpen={isWidgetSelectorOpen}
                          activeWidgetTriggerPosition={activeWidgetTriggerPosition}
                        />
                      </div>
                    );
                  })}
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
                      onDuplicateClick={onDeleteWidget}
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
                onAddWidgetClick(0, triggerRef);
              }}
              className="flex items-center justify-center w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 py-2 rounded-md"
            >
              <Plus size={16} className="mr-2" />
              <span className="text-sm font-medium">Add Widget</span>
            </button>
          </div>
        )}

        {footerWidget && <div className="my-4 border-t border-slate-200" />}

        {footerWidget && (
          <WidgetSection>
            <FixedWidgetItem
              widgetId="footer"
              widget={footerWidget}
              widgetSchema={widgetSchemas[footerWidget.type] || {}}
              isSelected={selectedGlobalWidgetId === "footer"}
              isModified={modifiedWidgets.has("footer")}
              onWidgetSelect={() => onGlobalWidgetSelect && onGlobalWidgetSelect("footer")}
            />
          </WidgetSection>
        )}
      </div>
    </div>
  );
}
