import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export default function WidgetSelector({ isOpen, onClose, widgetSchemas, onSelectWidget, position, triggerRef }) {
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      setSearchTerm(""); // Reset search when opening
      // Add a small delay to ensure the dropdown is fully rendered
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
        // Focus the search input
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const availableWidgets = Object.values(widgetSchemas)
    .filter((schema) => schema.type !== "header" && schema.type !== "footer")
    .sort((a, b) => (a.displayName || a.type).localeCompare(b.displayName || b.type));

  const filteredWidgets = availableWidgets.filter((schema) => {
    const name = schema.displayName || schema.type;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  // Calculate position relative to trigger
  let style = {
    position: "fixed",
    top: 100,
    left: 100,
    zIndex: 1000,
  };

  if (triggerRef?.current) {
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 224; // w-56 = 224px

    // Position the dropdown outside the sidebar (sidebar is w-60 = 240px)
    const sidebarWidth = 240;
    let leftPosition = sidebarWidth - 24; // Position closer to sidebar edge

    // If it would go off the right edge of the screen, position to the left instead
    if (leftPosition + dropdownWidth > window.innerWidth) {
      leftPosition = triggerRect.left - dropdownWidth - 12;
    }

    // Make sure it doesn't go off the left edge either
    if (leftPosition < 12) {
      leftPosition = 12;
    }

    // For vertical positioning, check if there's enough space below
    let topPosition = triggerRect.top;
    const estimatedDropdownHeight = 300; // Generous estimate

    // If dropdown would go off screen, position it above the trigger
    if (triggerRect.top + estimatedDropdownHeight > window.innerHeight - 20) {
      topPosition = triggerRect.top - estimatedDropdownHeight - 10;
    }

    style = {
      position: "fixed",
      top: Math.max(12, topPosition), // Don't go above top of screen
      left: leftPosition,
      zIndex: 1000,
    };
  }

  return (
    <>
      {/* Invisible overlay to catch clicks outside dropdown */}
      <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={onClose} />

      <div
        ref={dropdownRef}
        className="bg-white border-2 border-slate-300 rounded-lg shadow-lg w-56 flex flex-col"
        style={{
          ...style,
          position: "fixed", // Force fixed positioning
          zIndex: 9999, // Higher z-index
        }}
      >
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
          <h3 className="text-sm font-medium text-slate-700 text-left mb-2">Add Widget</h3>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm pl-8 pr-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {filteredWidgets.length > 0 ? (
            filteredWidgets.map((schema) => (
              <button
                key={schema.type}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors group border-b border-transparent hover:border-slate-100 last:border-0"
                onClick={() => {
                  onSelectWidget(schema.type, position);
                  onClose();
                }}
              >
                <div className="text-sm font-medium text-slate-800 group-hover:text-pink-600">
                  {schema.displayName || schema.type}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-slate-500">No widgets found</div>
          )}
        </div>
      </div>
    </>
  );
}
