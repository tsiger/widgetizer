import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Plus, Share2 } from "lucide-react";
import WidgetInsertionZone from "./WidgetInsertionZone";
import SortableWidgetItem from "./widgets/SortableWidgetItem";

/**
 * One shared area in the widget list: its widgets, in order, shared by every page
 * of this language. It has its own drag-and-drop list, so a widget is reordered
 * within the area and never dragged between the area and the page.
 */
export default function SharedAreaSection({
  areaId,
  label,
  languageName,
  content,
  widgetSchemas,
  isModified,
  selectedWidgetId,
  selectedBlockId,
  onWidgetSelect,
  onBlockSelect,
  onReorder,
  onAddWidgetClick,
  isWidgetSelectorOpen,
  activeWidgetTriggerPosition,
  onOpenContextMenu,
  onBlocksReorder,
  onAddBlockClick,
  isBlockSelectorOpen,
  activeWidgetId,
  activeBlockTriggerKey,
  onHover,
  onRenameWidget,
}) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedWidgets, setCollapsedWidgets] = useState({});
  const [draggingId, setDraggingId] = useState(null);

  const order = content?.widgetsOrder || [];
  const widgets = order.filter((id) => content?.widgets?.[id]).map((id) => ({ id, ...content.widgets[id] }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    setDraggingId(null);
    if (active?.id && selectedWidgetId !== active.id) onWidgetSelect(active.id);
    if (!over || active.id === over.id) return;
    const ids = widgets.map((widget) => widget.id);
    onReorder(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };

  const addAt = (position) => (event) => {
    event.stopPropagation();
    onAddWidgetClick(position, { current: event.currentTarget });
  };

  return (
    <div className="mb-4 rounded-md border border-sky-200 bg-sky-50/40" data-shared-area-section={areaId}>
      <button
        type="button"
        onClick={() => setIsCollapsed((value) => !value)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left"
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <Share2 size={12} className="text-sky-600 shrink-0" />
        <span className="text-xs font-semibold text-slate-700 truncate">{label}</span>
        {isModified && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" aria-hidden="true" />}
        <span className="ml-auto text-[11px] text-slate-500 shrink-0">
          {languageName ? t("pageEditor.sharedAreas.sharedIn", { language: languageName }) : t("pageEditor.sharedAreas.shared")}
          {widgets.length > 0 ? ` · ${widgets.length}` : ""}
        </span>
      </button>

      {!isCollapsed && (
        <div className="px-2 pb-2">
          {widgets.length === 0 ? (
            <div className="text-center py-3 px-2 border border-dashed border-slate-300 rounded-md bg-white">
              <p className="text-[11px] text-slate-500 mb-1">{t("pageEditor.sharedAreas.emptyHint")}</p>
              <button
                type="button"
                onClick={addAt(0)}
                className="flex items-center justify-center w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 py-1.5 rounded-md"
              >
                <Plus size={14} className="mr-1.5" />
                <span className="text-xs font-medium">{t("pageEditor.actions.addWidget")}</span>
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => setDraggingId(event.active.id)}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={widgets.map((widget) => widget.id)} strategy={verticalListSortingStrategy}>
                <WidgetInsertionZone
                  position={0}
                  onAddClick={onAddWidgetClick}
                  isWidgetSelectorOpen={isWidgetSelectorOpen}
                  activeWidgetTriggerPosition={activeWidgetTriggerPosition}
                />
                {widgets.map((widget, index) => (
                  <div key={widget.id} id={`sidebar-widget-${widget.id}`}>
                    <SortableWidgetItem
                      widgetId={widget.id}
                      widget={widget}
                      widgetSchema={widgetSchemas[widget.type] || {}}
                      isSelected={selectedWidgetId === widget.id}
                      isModified={false}
                      isDraggingAny={draggingId !== null}
                      onWidgetSelect={onWidgetSelect}
                      onOpenContextMenu={onOpenContextMenu}
                      selectedBlockId={selectedBlockId}
                      onBlockSelect={onBlockSelect}
                      onBlocksReorder={onBlocksReorder}
                      onAddBlockClick={onAddBlockClick}
                      isBlockSelectorOpen={isBlockSelectorOpen}
                      activeWidgetId={activeWidgetId}
                      activeBlockTriggerKey={activeBlockTriggerKey}
                      onHover={onHover}
                      onRenameWidget={onRenameWidget}
                      isCollapsed={!!collapsedWidgets[widget.id]}
                      onToggleCollapse={(nextCollapsed) => {
                        setCollapsedWidgets((prev) => ({ ...prev, [widget.id]: nextCollapsed }));
                        if (nextCollapsed && selectedWidgetId === widget.id && selectedBlockId) onBlockSelect(null);
                      }}
                    />
                    {index < widgets.length - 1 && (
                      <WidgetInsertionZone
                        position={index + 1}
                        onAddClick={onAddWidgetClick}
                        isWidgetSelectorOpen={isWidgetSelectorOpen}
                        activeWidgetTriggerPosition={activeWidgetTriggerPosition}
                      />
                    )}
                  </div>
                ))}
                <div className="pt-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 transition-colors"
                    onClick={addAt(widgets.length)}
                  >
                    <Plus size={12} />
                    <span>{t("pageEditor.actions.addWidget")}</span>
                  </button>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}
