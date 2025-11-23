/**
 * RadioInput component
 * Renders a group of radio buttons
 */
export default function RadioInput({ id, value = "", onChange, options = [] }) {
  // Handle the options format from theme.json
  const normalizedOptions = Array.isArray(options)
    ? options.map((opt) => {
        if (typeof opt === "string") {
          return { value: opt, label: opt };
        }
        // Handle the format in theme.json where options have id instead of value
        if (opt.id && !opt.value) {
          return { value: opt.id, label: opt.label || opt.id };
        }
        return opt;
      })
    : [];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {normalizedOptions.map((option) => (
        <div key={option.value} className="flex items-center">
          <input
            type="radio"
            id={`${id}-${option.value}`}
            name={id}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-slate-300"
          />
          <label htmlFor={`${id}-${option.value}`} className="ml-2 block text-sm text-slate-700">
            {option.label}
          </label>
        </div>
      ))}
    </div>
  );
}
