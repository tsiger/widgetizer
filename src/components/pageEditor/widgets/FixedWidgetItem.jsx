import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import SortableBlockItem from "../blocks/SortableBlockItem";
import BlockInsertionZone from "../blocks/BlockInsertionZone";
import { hasReachedMaxBlocks } from "../../../stores/widgetStore";

export default function FixedWidgetItem({
  widgetId,
  widget,
  widgetSchema,
  isSelected,
  isModified,
  onWidgetSelect,
  onHover,
  selectedBlockId,
  onBlockSelect,
  onBlocksReorder,
  onAddBlockClick,
  isBlockSelectorOpen,
  activeWidgetId,
  activeBlockTriggerKey,
}) {
  const { t } = useTranslation();
  const widgetName = widget.settings?.name || widgetSchema.displayName || widget.type;
  const hasBlocks = widgetSchema.blocks && widgetSchema.blocks.length > 0;
  const blocks = widget.blocks || {};
  const blockOrder = widget.blocksOrder || [];
  const atMaxBlocks = hasReachedMaxBlocks(widget, widgetSchema);

  const handleBlockDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const currentOrder = widget.blocksOrder || [];
      const oldIndex = currentOrder.indexOf(active.id);
      const newIndex = currentOrder.indexOf(over.id);
      const newOrder = [...currentOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id);
      onBlocksReorder(widgetId, newOrder);
    }
  };

  return (
    <div
      className={`rounded-sm border border-1 transition-all duration-200 ${
        isSelected
          ? "border-pink-300 bg-white ring-2 ring-pink-200 shadow-lg shadow-pink-100"
          : isModified
            ? "border-amber-400 bg-amber-50"
            : "border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100"
      }`}
      onMouseEnter={() => onHover && onHover(widgetId)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div
        className={`flex items-center gap-1 p-2 cursor-pointer group widget-item ${isSelected ? "bg-pink-50" : ""} rounded-sm`}
        onClick={() => onWidgetSelect && onWidgetSelect(widgetId)}
      >
        <div className="flex-grow min-w-0 flex items-center pl-1">
          <span className="font-medium text-xs truncate">{widgetName}</span>
          {isModified && <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes"></span>}
        </div>
      </div>

      {hasBlocks && isSelected && (
        <div className="border-t border-slate-100">
          <div className="p-2">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleBlockDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {blockOrder.length > 0 && !atMaxBlocks && (
                    <BlockInsertionZone
                      widgetId={widgetId}
                      position={0}
                      onAddClick={(wId, triggerRef) => onAddBlockClick(wId, triggerRef, 0)}
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
                          isAtMaxBlocks={atMaxBlocks}
                          onHover={onHover}
                          onBlockSelect={(clickedBlockId) => {
                            if (onWidgetSelect) onWidgetSelect(widgetId);
                            if (onBlockSelect) onBlockSelect(clickedBlockId);
                          }}
                        />
                        {index < blockOrder.length - 1 && !atMaxBlocks && (
                          <BlockInsertionZone
                            widgetId={widgetId}
                            position={index + 1}
                            onAddClick={(wId, triggerRef) => onAddBlockClick(wId, triggerRef, index + 1)}
                            isBlockSelectorOpen={isBlockSelectorOpen}
                            activeWidgetId={activeWidgetId}
                            activeBlockTriggerKey={activeBlockTriggerKey}
                          />
                        )}
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
                  <span className="text-sm font-medium">{t("pageEditor.actions.addBlock")}</span>
                </button>
              </div>
            )}

            {blockOrder.length > 0 && !atMaxBlocks && (
              <div className="pt-2">
                <button
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const triggerRef = { current: e.currentTarget };
                    onAddBlockClick(widgetId, triggerRef, blockOrder.length);
                  }}
                >
                  <Plus size={12} />
                  <span>{t("pageEditor.actions.addBlock")}</span>
                </button>
              </div>
            )}

            {widgetSchema.maxBlocks > 0 && blockOrder.length > 0 && (
              <div className="text-center pt-1">
                <span className={`text-xs ${atMaxBlocks ? "text-amber-600" : "text-slate-400"}`}>
                  {blockOrder.length}/{widgetSchema.maxBlocks}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
