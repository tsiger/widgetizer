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
      className={`rounded border transition-all hover:shadow-sm ${
        isSelected
          ? "border-blue-300 bg-blue-50"
          : isModified
            ? "border-amber-400"
            : "border-slate-200 hover:border-slate-300"
      }`}
      onMouseEnter={() => onHover && onHover(widgetId)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div
        className="flex items-center gap-1 p-2 cursor-pointer group widget-item"
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
