import { useState, useRef, useEffect } from "react";
import { HexColorPicker, HexAlphaColorPicker } from "react-colorful";

/**
 * ColorInput component
 * Renders a color picker with hex input and popover
 */
export default function ColorInput({ id, value = "#000000", onChange, allow_alpha = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const popoverRef = useRef(null);
  const colorPickerRef = useRef(null);

  // Sync local color with prop value when it changes
  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add mouse/touch event listeners to detect drag end
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onChange(localColor);
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onChange(localColor);
      }
    };

    if (isOpen) {
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, localColor, onChange, isOpen]);

  const handleColorChange = (newValue) => {
    if (newValue.startsWith("#")) {
      onChange(newValue);
    } else {
      onChange(`#${newValue}`);
    }
  };

  // Handle color picker changes - only update local state while dragging
  const handleColorPickerChange = (newColor) => {
    setLocalColor(newColor);
    if (!isDragging) {
      // If not dragging (e.g., single click), commit immediately
      onChange(newColor);
    }
  };

  // Handle mouse/touch down on color picker
  const handleColorPickerMouseDown = () => {
    setIsDragging(true);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-md border border-slate-300 shrink-0"
          style={{ backgroundColor: localColor }}
          aria-label="Open color picker"
        />
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">#</span>
          <input
            id={id}
            type="text"
            value={localColor.startsWith("#") ? localColor.substring(1) : localColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="form-input pl-7"
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-2 right-0">
          <div className="bg-white rounded-lg shadow-lg p-3 border border-slate-200">
            <div
              ref={colorPickerRef}
              onMouseDown={handleColorPickerMouseDown}
              onTouchStart={handleColorPickerMouseDown}
            >
              {allow_alpha ? (
                <HexAlphaColorPicker color={localColor} onChange={handleColorPickerChange} />
              ) : (
                <HexColorPicker color={localColor} onChange={handleColorPickerChange} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
