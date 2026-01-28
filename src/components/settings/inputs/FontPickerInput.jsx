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
const FONT_PREVIEW_LINK_ID = "font-picker-preview-fonts";
const FONT_PREVIEW_CACHE_KEY = "__fontPickerPreviewFonts";

function loadFontPreview(fontName, weight) {
  if (!fontName || !weight || typeof document === "undefined") return;

  const cache = window[FONT_PREVIEW_CACHE_KEY] || {};
  const weights = new Set(cache[fontName] || []);
  weights.add(weight);
  cache[fontName] = Array.from(weights);
  window[FONT_PREVIEW_CACHE_KEY] = cache;

  const families = Object.entries(cache)
    .map(([name, fontWeights]) => {
      const sorted = [...fontWeights].sort((a, b) => a - b);
      return `${encodeURIComponent(name)}:wght@${sorted.join(";")}`;
    })
    .join("|");

  if (!families) return;

  const url = `https://fonts.bunny.net/css?family=${families}&display=swap`;

  let link = document.getElementById(FONT_PREVIEW_LINK_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_PREVIEW_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  link.href = url;
}

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

  // Local UI state so preview updates immediately on selection.
  const [selectedStack, setSelectedStack] = useState(currentVal.stack);
  const selectedFontObject = ALL_FONTS_LIST.find((f) => f.stack === selectedStack) || DEFAULT_FONT_OBJECT;
  const [selectedWeight, setSelectedWeight] = useState(currentVal.weight ?? selectedFontObject.defaultWeight);

  // Sync local state if the value prop changes externally
  useEffect(() => {
    setSelectedStack(currentVal.stack);
    const newFontObject = ALL_FONTS_LIST.find((f) => f.stack === currentVal.stack) || DEFAULT_FONT_OBJECT;
    setSelectedWeight(currentVal.weight ?? newFontObject.defaultWeight);
  }, [currentVal.stack, currentVal.weight]);

  // Ensure Google Fonts are loaded for the preview text
  useEffect(() => {
    if (!selectedFontObject?.isGoogleFont) return;
    const weight = selectedWeight ?? selectedFontObject.defaultWeight;
    if (!weight) return;
    loadFontPreview(selectedFontObject.name, weight);
  }, [selectedFontObject, selectedWeight]);

  // Handle font stack selection
  const handleFontChange = (newFontStack) => {
    const newFontObject = ALL_FONTS_LIST.find((f) => f.stack === newFontStack) || DEFAULT_FONT_OBJECT;
    const newWeight = newFontObject.defaultWeight;
    setSelectedStack(newFontStack);
    setSelectedWeight(newWeight); // Update local state for UI consistency
    onChange({ stack: newFontStack, weight: newWeight }); // Pass object up
  };

  // Handle font weight selection
  const handleWeightChange = (newWeightString) => {
    const newWeight = parseInt(newWeightString, 10);
    setSelectedWeight(newWeight); // Update local state
    onChange({ stack: selectedStack, weight: newWeight }); // Pass object up
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        {/* Font Stack Selector */}
        <div className="w-full">
          <select
            id={id}
            value={selectedStack}
            onChange={(e) => handleFontChange(e.target.value)}
            className="form-select w-full"
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
          <div className="w-full">
            <select
              id={`${id}-weight`}
              value={selectedWeight}
              onChange={(e) => handleWeightChange(e.target.value)}
              className="form-select w-full"
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
          fontFamily: selectedStack,
          fontWeight: selectedWeight ?? selectedFontObject?.defaultWeight ?? "normal",
        }}
      >
        The quick brown fox jumps over the lazy dog.
      </div>
    </div>
  );
}
