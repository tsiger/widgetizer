/**
 * TextareaInput component
 * Renders a multiline text input
 */
export default function TextareaInput({ id, value = "", onChange, placeholder = "", rows = 6 }) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="form-textarea"
    />
  );
}
