/**
 * DateInput component
 * Renders a native date picker. The stored value is a calendar date string
 * ("YYYY-MM-DD") or "" when unset — date-only, no time, timezone-agnostic.
 */
export default function DateInput({ id, value = "", onChange }) {
  return (
    <input
      type="date"
      id={id}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="form-input"
    />
  );
}
