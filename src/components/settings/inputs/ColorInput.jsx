import { useState, useRef, useEffect } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import SettingsField from "../SettingsField";

/**
 * ColorInput component
 * Renders a color picker with hex input and popover
 */
export default function ColorInput({ id, label, value = "#000000", onChange, description, error }) {
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

  return (
    <SettingsField id={id} label={label} description={description} error={error}>
      <div className="relative" ref={popoverRef}>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-7.5 h-7.5 rounded border border-slate-300"
            style={{ backgroundColor: value }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="ml-2 px-3 py-1 border border-slate-300 rounded-sm text-sm w-32"
          />
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-2">
            <div className="bg-white rounded-lg shadow-lg p-4 border border-slate-200">
              <HexColorPicker color={value} onChange={onChange} />
              <HexColorInput color={value} onChange={onChange} />
            </div>
          </div>
        )}
      </div>
    </SettingsField>
  );
}
