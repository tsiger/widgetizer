import { GripVertical, Trash2, Copy, Plus } from "lucide-react";
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
  isBlockSelectorOpen,
  activeWidgetId,
  activeBlockTriggerKey,
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
      className={`rounded-lg border transition-all duration-200 ${
        isSelected
          ? "border-pink-300 bg-pink-50 shadow-sm ring-1 ring-pink-200"
          : isModified
            ? "border-amber-400 bg-amber-50"
            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      } ${isDragging ? "opacity-30" : ""} ${isOverlay ? "shadow-lg" : ""}`}
    >
      <div
        className="flex items-center gap-2 p-3 cursor-pointer group widget-item"
        onClick={(e) => {
          e.stopPropagation();
          onWidgetSelect(widgetId);
        }}
        {...dragHandleProps}
      >
        <div className="text-slate-400 hover:text-slate-600 transition-colors">
          <GripVertical size={16} />
        </div>
        <div className="flex-grow min-w-0 flex items-center gap-2">
          <span className="font-medium text-sm truncate text-slate-700">{widgetName}</span>
          {isModified && !isDragging && (
            <div className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-200" title="Unsaved changes"></div>
          )}
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1">
          <button
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-white/80 transition-colors"
            title="Duplicate widget"
            onClick={(e) => {
              e.stopPropagation();
              if (onDuplicateClick) onDuplicateClick(widgetId);
            }}
          >
            <Copy size={14} />
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-white/80 transition-colors"
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
                      onAddClick={(widgetId, triggerRef) => onAddBlockClick(widgetId, triggerRef, 0)}
                      isBlockSelectorOpen={isBlockSelectorOpen}
                      activeWidgetId={activeWidgetId}
                      activeBlockTriggerKey={activeBlockTriggerKey}
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
                          onAddClick={(widgetId, triggerRef) => onAddBlockClick(widgetId, triggerRef, index + 1)}
                          isBlockSelectorOpen={isBlockSelectorOpen}
                          activeWidgetId={activeWidgetId}
                          activeBlockTriggerKey={activeBlockTriggerKey}
                        />
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {blockOrder.length === 0 && (
              <div className="text-center py-2 px-2">
                <button
                  ref={(ref) => {
                    if (ref) {
                      ref.triggerRef = { current: ref };
                    }
                  }}
                  className={`w-full flex items-center justify-center py-2 rounded-md border-2 border-dashed transition-all ${
                    isSelected && !selectedBlockId
                      ? "text-blue-600 hover:bg-blue-50 border-blue-300 hover:border-blue-400"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-slate-300 hover:border-slate-400"
                  } ${isBlockSelectorOpen && activeBlockTriggerKey === `${widgetId}-add` ? "opacity-100 bg-blue-50 border-blue-400" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const triggerRef = { current: e.currentTarget };
                    onAddBlockClick(widgetId, triggerRef, "add");
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  <span className="text-sm font-medium">Add Block</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
