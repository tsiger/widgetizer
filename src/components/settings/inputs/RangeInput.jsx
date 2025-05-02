import { useState, useEffect } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import SettingsField from "../SettingsField";

/**
 * RangeInput component
 * Renders a styled range slider with numeric input
 */
export default function RangeInput({
  id,
  label,
  value = 0,
  onChange,
  description,
  error,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
}) {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <SettingsField id={id} label={label} description={description} error={error}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Slider
            value={localValue}
            min={min}
            max={max}
            step={step}
            onChange={handleChange}
            railStyle={{ backgroundColor: "#e2e8f0" }}
            trackStyle={[{ backgroundColor: "#3b82f6" }]}
            handleStyle={[
              {
                backgroundColor: "#fff",
                border: "2px solid #3b82f6",
                opacity: 1,
                width: "16px",
                height: "16px",
                marginTop: "-6px",
              },
            ]}
            activeDotStyle={{ borderColor: "#3b82f6" }}
            dotStyle={{ borderColor: "#e2e8f0" }}
          />
        </div>
        <div className="flex items-center min-w-[100px]">
          <input
            type="number"
            value={localValue}
            min={min}
            max={max}
            step={step}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-16 px-2 py-1 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {unit && <span className="ml-1 text-sm text-slate-500">{unit}</span>}
        </div>
      </div>
    </SettingsField>
  );
}
