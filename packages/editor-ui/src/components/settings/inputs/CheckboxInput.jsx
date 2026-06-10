/**
 * CheckboxInput component
 * Renders a toggle switch input
 */
export default function CheckboxInput({ id, value = false, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      id={id}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
        value ? "bg-pink-600" : "bg-slate-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          value ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
