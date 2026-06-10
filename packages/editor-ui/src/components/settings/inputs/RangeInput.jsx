import { useState, useEffect } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

/**
 * RangeInput component
 * Renders a styled range slider with numeric input
 */
export default function RangeInput({ id, value = 0, onChange, min = 0, max = 100, step = 1, unit = "" }) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (newValue) => {
    const clampedValue = Math.max(min, Math.min(newValue, max));
    setLocalValue(clampedValue);

    if (!isDragging) {
      // If not dragging (e.g., single click), commit immediately
      onChange(clampedValue);
    }
  };

  const handleSliderBeforeChange = () => {
    setIsDragging(true);
  };

  const handleSliderChangeComplete = (newValue) => {
    const clampedValue = Math.max(min, Math.min(newValue, max));
    setLocalValue(clampedValue);
    setIsDragging(false);
    onChange(clampedValue);
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value === "" ? min : Number(e.target.value);
    const clampedValue = Math.max(min, Math.min(inputValue, max));
    setLocalValue(clampedValue);
    onChange(clampedValue);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <Slider
          value={localValue}
          min={min}
          max={max}
          step={step}
          onChange={handleSliderChange}
          onBeforeChange={handleSliderBeforeChange}
          onChangeComplete={handleSliderChangeComplete}
          styles={{
            rail: { backgroundColor: "#e2e8f0", height: 6 },
            track: { backgroundColor: "#ec4899", height: 6 },
            handle: {
              backgroundColor: "#ec4899",
              border: "2px solid #ffffff",
              opacity: 1,
              width: "18px",
              height: "18px",
              marginTop: "-6px",
            },
          }}
        />
      </div>
      <div className="flex items-center">
        <input
          type="number"
          id={id}
          value={localValue}
          min={min}
          max={max}
          step={step}
          onChange={handleInputChange}
          onBlur={() => onChange(localValue)} // Ensure value is synced on blur
          className="form-input w-24 text-center"
        />
        {unit && <span className="ml-2 text-sm text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}
