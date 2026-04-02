import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight } from "lucide-react";
import WidgetItem from "./WidgetItem";

export default function SortableWidgetItem({
  widgetId,
  widget,
  widgetSchema,
  isSelected,
  isModified,
  isDraggingAny,
  onWidgetSelect,
  onDeleteClick,
  onDuplicateClick,
  selectedBlockId,
  onBlockSelect,
  onBlocksReorder,
  onAddBlockClick,
  isBlockSelectorOpen,
  activeWidgetId,
  activeBlockTriggerKey,
  onHover,
  onRenameWidget,
  isCollapsed,
  onToggleCollapse,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });

  const handleBlockDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const blockOrder = widget.blocksOrder || [];
      const oldIndex = blockOrder.indexOf(active.id);
      const newIndex = blockOrder.indexOf(over.id);
      const newOrder = [...blockOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id);
      onBlocksReorder(widgetId, newOrder);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Create drag handle props for everything except the action buttons
  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };
  const canCollapse = !!(widgetSchema.blocks && widgetSchema.blocks.length > 0);
  const isExpanded = canCollapse && isSelected && !isCollapsed;

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      <div className="flex w-4 self-stretch items-stretch">
        {canCollapse ? (
          <button
            type="button"
            className="flex h-full w-full items-start justify-center rounded-sm pt-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={isExpanded ? "Collapse widget" : "Expand widget"}
            title={isExpanded ? "Collapse widget" : "Expand widget"}
            onClick={(e) => {
              e.stopPropagation();
              if (isExpanded) {
                onToggleCollapse?.(true);
              } else {
                onWidgetSelect?.(widgetId);
                onToggleCollapse?.(false);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="block w-full" aria-hidden="true" />
        )}
      </div>

      <WidgetItem
        widgetId={widgetId}
        widget={widget}
        widgetSchema={widgetSchema}
        isSelected={isSelected}
        isModified={isModified}
        isDragging={isDragging}
        isDraggingAny={isDraggingAny}
        onWidgetSelect={onWidgetSelect}
        dragHandleProps={dragHandleProps}
        onDeleteClick={onDeleteClick}
        onDuplicateClick={onDuplicateClick}
        selectedBlockId={selectedBlockId}
        onBlockSelect={onBlockSelect}
        onBlocksReorder={onBlocksReorder}
        onAddBlockClick={onAddBlockClick}
        isBlockSelectorOpen={isBlockSelectorOpen}
        activeWidgetId={activeWidgetId}
        activeBlockTriggerKey={activeBlockTriggerKey}
        onBlockDragEnd={handleBlockDragEnd}
        onHover={onHover}
        onRenameWidget={onRenameWidget}
        isCollapsed={isCollapsed}
      />
    </div>
  );
}
