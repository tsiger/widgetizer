import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export default function WidgetSelector({ isOpen, onClose, widgetSchemas, onSelectWidget, position }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const availableWidgets = Object.values(widgetSchemas).filter(
    (schema) => schema.type !== "header" && schema.type !== "footer",
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start">
      <div className="absolute inset-0 bg-black/20" onClick={onClose}></div>

      <div
        ref={drawerRef}
        className="bg-white w-64 ml-108 h-full shadow-lg transform transition-transform duration-300 ease-in-out z-10 overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
          <div className="flex items-center justify-between p-2">
            <h3 className="font-medium text-slate-800 text-xs">Add Widget</h3>
            <button onClick={onClose} className="p-2 rounded-sm hover:bg-slate-100 text-slate-500" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-2">
          <div className="space-y-1">
            {availableWidgets.map((schema) => (
              <button
                key={schema.type}
                className="w-full flex items-center py-1.5 px-2 border border-slate-200 rounded-md hover:border-pink-500 hover:bg-pink-50 transition-colors text-left"
                onClick={() => {
                  onSelectWidget(schema.type, position);
                  onClose();
                }}
              >
                <span className="text-xs font-medium text-slate-700">{schema.displayName || schema.type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
