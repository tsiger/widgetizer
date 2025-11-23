/**
 * SelectInput component
 * Renders a styled dropdown select input
 */
export default function SelectInput({ id, value = "", onChange, options = [] }) {
  // Handle both array of strings and array of objects
  const normalizedOptions = Array.isArray(options)
    ? options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt))
    : [];

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="form-select">
      {normalizedOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
