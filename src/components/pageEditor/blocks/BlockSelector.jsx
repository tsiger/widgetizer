import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

export default function BlockSelector({ isOpen, onClose, widgetSchema, onSelectBlock, triggerRef }) {
  const { t } = useTranslation();
  const dropdownRef = useRef(null);
  const [positionStyle, setPositionStyle] = useState({});

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
      // Add a small delay to ensure the dropdown is fully rendered
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
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

  // Calculate position securely with useLayoutEffect to prevent flicker
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef?.current || !dropdownRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRect.height || 200; // Fallback if not yet measured
    const dropdownWidth = 224; // w-56

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Default position: to the right of the sidebar
    // Sidebar width is typically 280px (w-70)
    let left = 280 - 24; // Overlap slightly

    // Ensure horizontal fit
    if (left + dropdownWidth > viewportWidth) {
      // If fits to the left of trigger
      if (triggerRect.left - dropdownWidth > 0) {
        left = triggerRect.left - dropdownWidth;
      } else {
        // Center if tight
        left = Math.max(10, (viewportWidth - dropdownWidth) / 2);
      }
    }

    // Vertical positioning
    let top = triggerRect.top;

    // Check if it fits below
    const fitsBelow = top + dropdownHeight < viewportHeight - 10;

    if (!fitsBelow) {
      // Try positioning above
      const topAbove = triggerRect.top - dropdownHeight + triggerRect.height;

      // If fits above (and not off top of screen)
      if (topAbove > 10) {
        top = topAbove;
      } else {
        // If fits neither, position at bottom of viewport
        top = viewportHeight - dropdownHeight - 10;
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPositionStyle({
      position: "fixed",
      top: top,
      left: left,
      zIndex: 9999,
      width: dropdownWidth,
    });
  }, [isOpen, triggerRef]);

  if (!isOpen || !widgetSchema?.blocks) return null;

  return (
    <>
      {/* Invisible overlay to catch clicks outside dropdown */}
      <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={onClose} />

      <div
        ref={dropdownRef}
        className="bg-white border-2 border-slate-300 rounded-lg shadow-lg"
        style={positionStyle.top ? positionStyle : { visibility: "hidden", position: "fixed" }} // Hide until positioned
      >
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
          <h3 className="text-sm font-medium text-slate-700 text-left">{t("pageEditor.actions.addBlock")}</h3>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {widgetSchema.blocks.map((blockSchema) => (
            <button
              key={blockSchema.type}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors group"
              onClick={() => {
                onSelectBlock(blockSchema.type);
                onClose();
              }}
            >
              <div className="text-sm font-medium text-slate-800 group-hover:text-pink-600">
                {blockSchema.displayName || blockSchema.type}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
