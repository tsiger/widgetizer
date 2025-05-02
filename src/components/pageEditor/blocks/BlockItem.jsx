import { GripVertical, Copy, Trash2 } from "lucide-react";
import useWidgetStore from "../../../stores/widgetStore";
import useAutoSave from "../../../stores/saveStore";

export default function BlockItem({
  widgetId,
  blockId,
  block,
  blockSchema,
  isSelected,
  isDragging,
  onBlockSelect,
  dragHandleProps = {},
}) {
  const blockName = blockSchema?.displayName || block.type || "Block";
  const duplicateBlock = useWidgetStore((state) => state.duplicateBlock);
  const deleteBlock = useWidgetStore((state) => state.deleteBlock);
  const markWidgetModified = useAutoSave((state) => state.markWidgetModified);

  const handleDuplicate = (e) => {
    e.stopPropagation();
    if (widgetId && blockId) {
      duplicateBlock(widgetId, blockId);
      markWidgetModified(widgetId);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (widgetId && blockId) {
      deleteBlock(widgetId, blockId);
      markWidgetModified(widgetId);
    }
  };

  return (
    <div
      className={`flex items-center gap-1 p-1 rounded border group select-none ${
        isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300"
      } ${isDragging ? "opacity-50" : ""} cursor-pointer text-xs`}
      onClick={(e) => {
        e.stopPropagation();
        onBlockSelect(blockId);
      }}
    >
      <div className="text-slate-400" {...dragHandleProps}>
        <GripVertical size={14} />
      </div>
      <span className="truncate flex-grow">{blockName}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-0.5 text-slate-400 hover:text-blue-500 rounded hover:bg-slate-100"
          onClick={handleDuplicate}
          title="Duplicate block"
        >
          <Copy size={14} />
        </button>

        <button
          className="p-0.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100"
          onClick={handleDelete}
          title="Delete block"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
