import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function WidgetSelector({ isOpen, onClose, widgetSchemas, onSelectWidget, position, triggerRef }) {
  const { t } = useTranslation();
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const availableWidgets = Object.values(widgetSchemas)
    .filter((schema) => schema.type !== "header" && schema.type !== "footer")
    .sort((a, b) => (a.displayName || a.type).localeCompare(b.displayName || b.type));

  const filteredWidgets = availableWidgets.filter((schema) => {
    const name = schema.displayName || schema.type;
    const aliases = schema.aliases || [];
    const searchLower = searchTerm.toLowerCase();

    return name.toLowerCase().includes(searchLower) ||
      aliases.some(alias => alias.toLowerCase().includes(searchLower));
  });

  // Reset focused index when search changes or dropdown opens
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (!isOpen) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((prev) => {
          const nextIndex = prev < filteredWidgets.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((prev) => {
          const nextIndex = prev > 0 ? prev - 1 : filteredWidgets.length - 1;
          return nextIndex;
        });
        break;
      case "Enter":
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredWidgets.length) {
          onSelectWidget(filteredWidgets[focusedIndex].type, position);
          onClose();
        } else if (filteredWidgets.length === 1) {
          // If only one result and nothing focused, select it
          onSelectWidget(filteredWidgets[0].type, position);
          onClose();
        }
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      case "Tab":
        // Allow tab to close and move focus naturally
        onClose();
        break;
      default:
        break;
    }
  }, [isOpen, focusedIndex, filteredWidgets, onSelectWidget, position, onClose]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex];
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex]);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchTerm(""); // Reset search when opening
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusedIndex(-1); // Reset focused index when opening
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

  // Calculate position relative to trigger (using useLayoutEffect to avoid accessing refs during render)
  const [style, setStyle] = useState({
    position: "fixed",
    top: 100,
    left: 100,
    zIndex: 1000,
  });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef?.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 224; // w-56 = 224px

    // Position the dropdown outside the sidebar (sidebar is w-70 = 280px)
    const sidebarWidth = 280;
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyle({
      position: "fixed",
      top: Math.max(12, topPosition), // Don't go above top of screen
      left: leftPosition,
      zIndex: 1000,
    });
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

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
          <h3 className="text-sm font-medium text-slate-700 text-left mb-2">{t("pageEditor.actions.addWidget")}</h3>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t("common.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm pl-8 pr-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="widget-selector-list"
              aria-activedescendant={focusedIndex >= 0 ? `widget-option-${filteredWidgets[focusedIndex]?.type}` : undefined}
            />
          </div>
        </div>

        <div
          ref={listRef}
          id="widget-selector-list"
          className="max-h-64 overflow-y-auto"
          role="listbox"
        >
          {filteredWidgets.length > 0 ? (
            filteredWidgets.map((schema, index) => (
              <button
                key={schema.type}
                id={`widget-option-${schema.type}`}
                role="option"
                aria-selected={focusedIndex === index}
                className={`w-full px-3 py-2 text-left transition-colors group border-b border-transparent last:border-0 ${
                  focusedIndex === index
                    ? "bg-pink-50 border-pink-100"
                    : "hover:bg-slate-50 hover:border-slate-100"
                }`}
                onClick={() => {
                  onSelectWidget(schema.type, position);
                  onClose();
                }}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <div className={`text-sm font-medium ${
                  focusedIndex === index
                    ? "text-pink-600"
                    : "text-slate-800 group-hover:text-pink-600"
                }`}>
                  {schema.displayName || schema.type}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-slate-500">{t("pageEditor.noWidgetsFound")}</div>
          )}
        </div>
      </div>
    </>
  );
}
