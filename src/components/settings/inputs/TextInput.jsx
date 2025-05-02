import SettingsField from "../SettingsField";

/**
 * TextInput component
 * Renders a standard text input with support for different input types
 */
export default function TextInput({
  id,
  label,
  value = "",
  onChange,
  description,
  error,
  placeholder = "",
  type = "text",
  min,
  max,
  step,
}) {
  return (
    <SettingsField id={id} label={label} description={description} error={error}>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => {
          const newValue = type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
          onChange(newValue);
        }}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 border border-slate-300 rounded-sm text-xs"
        {...(type === "number" && {
          min: min,
          max: max,
          step: step,
        })}
      />
    </SettingsField>
  );
}
