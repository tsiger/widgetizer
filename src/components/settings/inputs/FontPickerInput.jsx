import { useState, useEffect } from "react";
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
  // Value is now an object { stack: string, weight: number | null }
  value = { stack: DEFAULT_FONT_OBJECT.stack, weight: DEFAULT_FONT_OBJECT.defaultWeight },
  onChange,
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
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        {/* Font Stack Selector */}
        <div className="flex-grow">
          <select
            id={id}
            value={currentVal.stack}
            onChange={(e) => handleFontChange(e.target.value)}
            className="form-select"
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
        {selectedFontObject?.availableWeights && selectedFontObject.availableWeights.length > 0 && (
          <div className="w-40 shrink-0">
            <select
              id={`${id}-weight`}
              value={selectedWeight}
              onChange={(e) => handleWeightChange(e.target.value)}
              className="form-select"
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
        className="text-lg"
        style={{
          fontFamily: currentVal.stack,
          fontWeight: currentVal.weight ?? selectedFontObject?.defaultWeight ?? "normal",
        }}
      >
        The quick brown fox jumps over the lazy dog.
      </div>
    </div>
  );
}
