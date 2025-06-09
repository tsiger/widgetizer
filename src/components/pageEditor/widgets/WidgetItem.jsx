import { GripVertical, Trash2, Copy } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import SortableBlockItem from "../blocks/SortableBlockItem";
import BlockInsertionZone from "../blocks/BlockInsertionZone";

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
          <div className="p-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {blockOrder.length > 0 && (
                    <BlockInsertionZone
                      widgetId={widgetId}
                      position={0}
                      onAddClick={(widgetId, position) => onAddBlockClick(widgetId, position)}
                    />
                  )}

                  {blockOrder.map((blockId, index) => {
                    const block = blocks[blockId];
                    if (!block) return null;

                    const blockSchema = widgetSchema.blocks.find((schema) => schema.type === block.type);

                    return (
                      <div key={blockId}>
                        <SortableBlockItem
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
                        <BlockInsertionZone
                          widgetId={widgetId}
                          position={index + 1}
                          onAddClick={(widgetId, position) => onAddBlockClick(widgetId, position)}
                        />
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {blockOrder.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 mb-2">No blocks added yet</p>
                <button
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBlockClick(widgetId, 0);
                  }}
                >
                  Add Block
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
