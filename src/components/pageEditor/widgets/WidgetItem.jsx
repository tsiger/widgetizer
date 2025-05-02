import { GripVertical, Trash2, Copy } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import SortableBlockItem from "../blocks/SortableBlockItem";

export default function WidgetItem({
  widgetId,
  widget,
  widgetSchema,
  isSelected,
  isModified,
  isDragging,
  isOverlay = false,
  onWidgetSelect,
  dragHandleProps = {},
  onDeleteClick,
  onDuplicateClick,
  onBlockSelect,
  selectedBlockId,
  onBlocksReorder,
  onAddBlockClick,
}) {
  const widgetName = widget.settings?.name || widgetSchema.displayName || widget.type;
  const hasBlocks = widgetSchema.blocks && widgetSchema.blocks.length > 0;
  const blocks = widget.blocks || {};
  const blockOrder = widget.blocksOrder || [];

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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blockOrder.indexOf(active.id);
      const newIndex = blockOrder.indexOf(over.id);
      const newOrder = [...blockOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id);
      onBlocksReorder(widgetId, newOrder);
    }
  };

  return (
    <div
      className={`rounded-md border transition-all hover:shadow-sm ${
        isSelected && !selectedBlockId
          ? "border-blue-300 bg-blue-50"
          : isModified
            ? "border-amber-400"
            : "border-slate-200 hover:border-slate-300"
      } ${isDragging ? "opacity-30" : ""} ${isOverlay ? "shadow-lg" : ""}`}
    >
      <div
        className="flex items-center gap-1 p-1 cursor-pointer group widget-item"
        onClick={(e) => {
          e.stopPropagation();
          onWidgetSelect(widgetId);
        }}
        {...dragHandleProps}
      >
        <div className="text-slate-400">
          <GripVertical size={16} />
        </div>
        <div className="flex-grow min-w-0 flex items-center">
          <span className="font-medium text-xs truncate">{widgetName}</span>
          {isModified && !isDragging && (
            <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes"></span>
          )}
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100"
            title="Duplicate widget"
            onClick={(e) => {
              e.stopPropagation();
              if (onDuplicateClick) onDuplicateClick(widgetId);
            }}
          >
            <Copy size={14} />
          </button>
          <button
            className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100"
            title="Delete widget"
            onClick={(e) => {
              e.stopPropagation();
              if (onDeleteClick) onDeleteClick(widgetId);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasBlocks && (
        <div className="border-t border-slate-100">
          <div className="p-2 space-y-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
                {blockOrder.map((blockId) => {
                  const block = blocks[blockId];
                  if (!block) return null;

                  const blockSchema = widgetSchema.blocks.find((schema) => schema.type === block.type);

                  return (
                    <SortableBlockItem
                      key={blockId}
                      widgetId={widgetId}
                      blockId={blockId}
                      block={block}
                      blockSchema={blockSchema}
                      isSelected={blockId === selectedBlockId && isSelected}
                      onBlockSelect={(clickedBlockId) => {
                        if (onWidgetSelect) onWidgetSelect(widgetId);
                        if (onBlockSelect) onBlockSelect(clickedBlockId);
                      }}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            <button
              className="w-full text-xs p-1 bg-slate-200 text-slate-700 hover:bg-slate-700 hover:text-slate-100 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onAddBlockClick(widgetId);
              }}
            >
              Add block
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
