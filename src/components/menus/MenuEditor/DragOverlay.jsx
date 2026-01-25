import { GripVertical } from "lucide-react";

function DragOverlayComponent({ activeItem }) {
  if (!activeItem) return null;

  return (
    <div className="flex items-center p-3 gap-3 border border-slate-300 rounded-md bg-slate-200 shadow-lg">
      <div className="flex items-center gap-1">
        <div className="cursor-grab p-1 text-slate-400">
          <GripVertical size={18} />
        </div>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <span className="flex-1 px-2 py-1 text-sm font-medium">{activeItem.label || "Item"}</span>
        <span className="w-64 px-2 py-1 text-xs text-slate-500">{activeItem.link || ""}</span>
      </div>
    </div>
  );
}

export default DragOverlayComponent;
