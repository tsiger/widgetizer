/**
 * SettingsField component
 * Wraps any input with a label and description
 */
export default function SettingsField({ label, id, description, children, error, type }) {
  const isCheckbox = type === "checkbox";

  if (isCheckbox) {
    return (
      <div className="mb-2">
        <div className="flex items-start gap-3">
          <div className="pt-0.5">{children}</div>
          <div>
            <div className="text-sm font-medium text-slate-700">{label}</div>
            {description && <div className="text-sm text-slate-500">{description}</div>}
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-sm font-bold text-slate-800 mb-1">
        {label}
      </label>
      {children}
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
