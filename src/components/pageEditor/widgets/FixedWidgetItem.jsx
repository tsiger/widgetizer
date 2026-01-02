export default function FixedWidgetItem({
  widgetId,
  widget,
  widgetSchema,
  isSelected,
  isModified,
  onWidgetSelect,
  onHover,
}) {
  const widgetName = widget.settings?.name || widgetSchema.displayName || widget.type;

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
    </div>
  );
}
