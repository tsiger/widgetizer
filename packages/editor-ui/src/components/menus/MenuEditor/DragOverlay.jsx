import { GripVertical } from "lucide-react";

const INDENT_WIDTH = 20;

function DragOverlayComponent({ activeItem, projectedDepth = 0, width }) {
  if (!activeItem) return null;

  return (
    <div
      className="pointer-events-none"
      style={{ width: width ? `${width}px` : undefined, boxSizing: "border-box" }}
    >
      <div
        className="flex items-center p-3 gap-3 border border-slate-300 rounded-md bg-slate-200 shadow-lg"
        style={{ marginLeft: `${projectedDepth * INDENT_WIDTH}px` }}
      >
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
    </div>
  );
}

export default DragOverlayComponent;
