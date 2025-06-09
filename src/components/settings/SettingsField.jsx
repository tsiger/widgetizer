import FormField from "../ui/FormField";

/**
 * SettingsField component
 * Wraps any input with a label and description
 */
export default function SettingsField({ label, id, description, children, error, type }) {
  const isCheckbox = type === "checkbox";

  // Handle toggle switch style layout
  if (isCheckbox) {
    return (
      <FormField help={description} error={error}>
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="form-label cursor-pointer">
            {label}
          </label>
          {children}
        </div>
      </FormField>
    );
  }

  // Handle standard layout
  return (
    <FormField id={id} label={label} help={description} error={error}>
      {children}
    </FormField>
  );
}
