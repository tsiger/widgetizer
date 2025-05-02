import SettingsField from "../SettingsField";

/**
 * TextareaInput component
 * Renders a multiline text input
 */
export default function TextareaInput({
  id,
  label,
  value = "",
  onChange,
  description,
  error,
  placeholder = "",
  rows = 4,
}) {
  return (
    <SettingsField id={id} label={label} description={description} error={error}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-slate-300 rounded-sm text-xs"
      />
    </SettingsField>
  );
}
