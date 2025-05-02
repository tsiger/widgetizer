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
import WidgetInsertionZone from "./WidgetInsertionZone";
import SortableWidgetItem from "./widgets/SortableWidgetItem";
import FixedWidgetItem from "./widgets/FixedWidgetItem";
import WidgetItem from "./widgets/WidgetItem";
import WidgetSection from "./widgets/WidgetSection";

export default function WidgetList({
  page,
  widgets,
  widgetSchemas,
  selectedWidgetId,
  selectedBlockId,
  modifiedWidgets = new Set(),
  onWidgetSelect,
  onBlockSelect,
  onWidgetsReorder,
  onBlocksReorder,
  onDeleteWidget,
  onDuplicateWidget,
  onAddWidgetClick,
  onAddBlockClick,
}) {
  const [activeId, setActiveId] = useState(null);

  // Find header and footer widgets
  const headerWidget = Object.entries(widgets).find(([_, widget]) => widget.type === "header");
  const footerWidget = Object.entries(widgets).find(([_, widget]) => widget.type === "footer");

  // Derive the list of sortable widgets based on page.widgetsOrder
  const sortableWidgetIds = (page.widgetsOrder || []).filter(
    (widgetId) => widgets[widgetId] && widgets[widgetId]?.type !== "header" && widgets[widgetId]?.type !== "footer",
  );

  const sortableWidgets = sortableWidgetIds.map((widgetId) => ({
    id: widgetId,
    ...(widgets[widgetId] || {}), // Get data from widgets object, handle potential missing data
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

    // Prevent dragging header and footer
    if (draggedId === headerWidget?.[0] || draggedId === footerWidget?.[0]) {
      return;
    }

    setActiveId(draggedId);

    if (selectedWidgetId !== draggedId && onWidgetSelect) {
      onWidgetSelect(draggedId);
    }
  };

  const handleDragEnd = (event) => {
    setActiveId(null);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Get the current widget IDs in order (only sortable widgets)
      const oldWidgetIds = sortableWidgets.map((item) => item.id);

      // Find the indices
      const oldIndex = oldWidgetIds.indexOf(active.id);
      const newIndex = oldWidgetIds.indexOf(over.id);

      // Create the new order
      const newOrder = arrayMove(oldWidgetIds, oldIndex, newIndex);

      // Include header and footer in the proper positions when sending back the order
      const fullOrder = [];

      // Add header if it exists
      if (headerWidget) {
        fullOrder.push(headerWidget[0]);
      }

      // Add sortable widgets in their new order
      fullOrder.push(...newOrder);

      // Add footer if it exists
      if (footerWidget) {
        fullOrder.push(footerWidget[0]);
      }

      // Call the handler with the new order
      if (onWidgetsReorder) {
        onWidgetsReorder(fullOrder);
      }
    }
  };

  // Find the active widget for the overlay
  const activeWidget = activeId ? sortableWidgets.find((item) => item.id === activeId) : null;
  const activeWidgetSchema = activeWidget ? widgetSchemas[activeWidget.type] || {} : {};

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto flex-grow p-3">
        {headerWidget && (
          <WidgetSection>
            <FixedWidgetItem
              widgetId={headerWidget[0]}
              widget={headerWidget[1]}
              widgetSchema={widgetSchemas[headerWidget[1].type] || {}}
              isSelected={selectedWidgetId === headerWidget[0]}
              isModified={modifiedWidgets.has(headerWidget[0])}
              onWidgetSelect={onWidgetSelect}
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
                  <WidgetInsertionZone position={0} onAddClick={onAddWidgetClick} />

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
                        />
                        <WidgetInsertionZone position={index + 1} onAddClick={onAddWidgetClick} />
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
            <p className="text-xs text-slate-500 mb-2">No content widgets added yet</p>
            <button
              onClick={() => onAddWidgetClick(0)}
              className="px-3 py-1.5 bg-pink-600 text-white text-sm rounded-sm hover:bg-pink-700"
            >
              Add Widget
            </button>
          </div>
        )}

        {footerWidget && <div className="my-4 border-t border-slate-200" />}

        {footerWidget && (
          <WidgetSection>
            <FixedWidgetItem
              widgetId={footerWidget[0]}
              widget={footerWidget[1]}
              widgetSchema={widgetSchemas[footerWidget[1].type] || {}}
              isSelected={selectedWidgetId === footerWidget[0]}
              isModified={modifiedWidgets.has(footerWidget[0])}
              onWidgetSelect={onWidgetSelect}
            />
          </WidgetSection>
        )}
      </div>
    </div>
  );
}
