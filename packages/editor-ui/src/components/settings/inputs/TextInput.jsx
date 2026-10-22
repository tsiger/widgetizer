/**
 * TextInput component
 * Renders a standard text input with support for different input types
 */
export default function TextInput({ id, value = "", onChange, placeholder = "", type = "text", min, max, step }) {
  // Clamped on blur rather than per keystroke, so typing "12" toward a max of 20 isn't cut short at "1".
  const clampOnBlur = (e) => {
    if (e.target.value === "") return;
    const typed = Number(e.target.value);
    let clamped = typed;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    if (clamped !== typed) onChange(clamped);
  };

  return (
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => {
        const newValue = type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
        onChange(newValue);
      }}
      placeholder={placeholder}
      className="form-input"
      {...(type === "number" && {
        min: min,
        max: max,
        step: step,
        onBlur: clampOnBlur,
      })}
    />
  );
}
