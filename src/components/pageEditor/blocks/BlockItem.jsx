import { GripVertical, Copy, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  onHover,
}) {
  const { t } = useTranslation();
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
      className={`flex items-center gap-2 p-1 rounded-sm border group select-none transition-all duration-200 ${
        isSelected
          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
          : "border-slate-200 hover:border-slate-300 hover:shadow-"
      } ${isDragging ? "opacity-50" : ""} cursor-pointer`}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHover && onHover(widgetId, blockId);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onHover && onHover(widgetId);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onBlockSelect(blockId);
      }}
    >
      <div className="text-slate-400 hover:text-slate-600 transition-colors" {...dragHandleProps}>
        <GripVertical size={14} />
      </div>
      <span className="truncate flex-grow text-xs font-medium text-slate-600">{blockName}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-md hover:bg-white/80 transition-colors"
          onClick={handleDuplicate}
          title={t("pageEditor.actions.duplicateBlock")}
        >
          <Copy size={12} />
        </button>

        <button
          className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-white/80 transition-colors"
          onClick={handleDelete}
          title={t("pageEditor.actions.deleteBlock")}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
