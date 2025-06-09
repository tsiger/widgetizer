import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

/**
 * ColorInput component
 * Renders a color picker with hex input and popover
 */
export default function ColorInput({ id, value = "#000000", onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleColorChange = (newValue) => {
    if (newValue.startsWith("#")) {
      onChange(newValue);
    } else {
      onChange(`#${newValue}`);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex items-center gap-2">
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-md border border-slate-300 shrink-0"
          style={{ backgroundColor: value }}
        />
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">#</span>
          <input
            type="text"
            value={value.startsWith("#") ? value.substring(1) : value}
            onChange={(e) => handleColorChange(e.target.value)}
            className="form-input pl-7"
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-2 right-0">
          <div className="bg-white rounded-lg shadow-lg p-3 border border-slate-200">
            <HexColorPicker color={value} onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  );
}
