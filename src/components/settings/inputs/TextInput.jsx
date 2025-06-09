/**
 * TextInput component
 * Renders a standard text input with support for different input types
 */
export default function TextInput({ id, value = "", onChange, placeholder = "", type = "text", min, max, step }) {
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
      })}
    />
  );
}
