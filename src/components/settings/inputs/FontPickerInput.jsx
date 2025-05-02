import { useState, useEffect } from "react";
import SettingsField from "../SettingsField";
// Import from JSON using the 'with' keyword
import fontDefinitions from "../../../core/config/fonts.json" with { type: "json" };

// Define font weight names
const FONT_WEIGHT_NAMES = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Normal",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

// Use data from imported JSON
const SYSTEM_FONTS = fontDefinitions.system;
const GOOGLE_FONTS = fontDefinitions.google;
const DEFAULT_FONTS_CATEGORIZED = {
  System: SYSTEM_FONTS,
  Google: GOOGLE_FONTS,
};
const ALL_FONTS_LIST = [...SYSTEM_FONTS, ...GOOGLE_FONTS];
const DEFAULT_FONT_OBJECT = SYSTEM_FONTS[0]; // System UI

/**
 * FontPickerInput component
 * Renders font and weight selection dropdowns
 */
export default function FontPickerInput({
  id,
  label,
  // Value is now an object { stack: string, weight: number | null }
  value = { stack: DEFAULT_FONT_OBJECT.stack, weight: DEFAULT_FONT_OBJECT.defaultWeight },
  onChange,
  description,
  error,
  fonts = DEFAULT_FONTS_CATEGORIZED, // Expects categorized object
}) {
  // Ensure value is an object, provide defaults if not
  const currentVal =
    typeof value === "object" && value !== null && value.stack
      ? value
      : { stack: DEFAULT_FONT_OBJECT.stack, weight: DEFAULT_FONT_OBJECT.defaultWeight };

  // Find the full font object based on the stack in the current value
  const selectedFontObject = ALL_FONTS_LIST.find((f) => f.stack === currentVal.stack) || DEFAULT_FONT_OBJECT;

  // State for the selected weight UI component
  const [selectedWeight, setSelectedWeight] = useState(currentVal.weight ?? selectedFontObject.defaultWeight);

  // Sync local weight state if the value prop changes externally
  useEffect(() => {
    const newFontObject = ALL_FONTS_LIST.find((f) => f.stack === currentVal.stack) || DEFAULT_FONT_OBJECT;
    setSelectedWeight(currentVal.weight ?? newFontObject.defaultWeight);
  }, [currentVal.stack, currentVal.weight]);

  // Handle font stack selection
  const handleFontChange = (newFontStack) => {
    const newFontObject = ALL_FONTS_LIST.find((f) => f.stack === newFontStack) || DEFAULT_FONT_OBJECT;
    const newWeight = newFontObject.defaultWeight;
    setSelectedWeight(newWeight); // Update local state for UI consistency
    onChange({ stack: newFontStack, weight: newWeight }); // Pass object up
  };

  // Handle font weight selection
  const handleWeightChange = (newWeightString) => {
    const newWeight = parseInt(newWeightString, 10);
    setSelectedWeight(newWeight); // Update local state
    onChange({ stack: currentVal.stack, weight: newWeight }); // Pass object up
  };

  return (
    <SettingsField id={id} label={label} description={description} error={error}>
      <div className="flex gap-2 items-center">
        {/* Font Stack Selector */}
        <div className="relative flex-grow">
          <select
            id={id}
            value={currentVal.stack}
            onChange={(e) => handleFontChange(e.target.value)}
            className="w-full h-[30px] px-3 border border-slate-300 rounded-sm text-sm appearance-none bg-white bg-no-repeat bg-[right_8px_center] bg-[length:16px_16px] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%23475565%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(fonts).map(([category, fontList]) => (
              <optgroup key={category} label={category}>
                {fontList.map((font) => (
                  <option key={font.stack} value={font.stack} style={{ fontFamily: font.stack }}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Weight Selector (Conditional) */}
        {/* Show if the selected font has available weights defined */}
        {selectedFontObject?.availableWeights && selectedFontObject.availableWeights.length > 0 && (
          <div className="relative w-28">
            <select
              id={`${id}-weight`}
              value={selectedWeight}
              onChange={(e) => handleWeightChange(e.target.value)}
              className="w-full h-[30px] px-3 border border-slate-300 rounded-sm text-sm appearance-none bg-white bg-no-repeat bg-[right_8px_center] bg-[length:16px_16px] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%23475565%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Font weight"
            >
              {selectedFontObject.availableWeights.map((weight) => (
                <option key={weight} value={weight}>
                  {FONT_WEIGHT_NAMES[weight] || weight}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Font preview */}
      <div
        className="mt-2 p-2 border border-slate-200 rounded-sm"
        style={{
          fontFamily: currentVal.stack,
          // Apply weight if it exists in the value object, otherwise use default or normal
          fontWeight: currentVal.weight ?? selectedFontObject?.defaultWeight ?? "normal",
        }}
      >
        <p className="text-sm">The quick brown fox jumps over the lazy dog.</p>
      </div>
    </SettingsField>
  );
}
