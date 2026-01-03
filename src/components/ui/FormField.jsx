import { forwardRef } from "react";

/**
 * Form field wrapper component that provides consistent layout,
 * labels, error states, and help text
 */
export default function FormField({ id, label, error, help, required = false, className = "", children, ...props }) {
  return (
    <div className={`form-field ${className}`} {...props}>
      {label && (
        <label htmlFor={id} className={`form-label ${required ? "form-label-required" : ""}`}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {help && !error && <p className="form-description">{help}</p>}
    </div>
  );
}

/**
 * Text input component with consistent styling and error states
 */
export const Input = forwardRef(({ error, className = "", ...props }, ref) => {
  const inputClass = error ? "form-input-error" : "form-input";

  return (
    <input ref={ref} className={`${inputClass} ${className}`} aria-invalid={error ? "true" : "false"} {...props} />
  );
});

Input.displayName = "Input";

/**
 * Textarea component with consistent styling
 */
export const Textarea = forwardRef(({ error, className = "", rows = 4, ...props }, ref) => {
  const textareaClass = error ? "form-input-error form-textarea" : "form-textarea";

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${textareaClass} ${className}`}
      aria-invalid={error ? "true" : "false"}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

/**
 * Select component with consistent styling
 */
export const Select = forwardRef(({ error, className = "", children, placeholder, ...props }, ref) => {
  const selectClass = error ? "form-input-error form-select" : "form-select";

  return (
    <select ref={ref} className={`${selectClass} ${className}`} aria-invalid={error ? "true" : "false"} {...props}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
});

Select.displayName = "Select";

/**
 * Checkbox component with label integration
 */
export const Checkbox = forwardRef(({ label, error, className = "", id, ...props }, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className="text-sm text-neutral-700 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

/**
 * Radio button component with label integration
 */
export const Radio = forwardRef(({ label, error, className = "", id, ...props }, ref) => {
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        ref={ref}
        type="radio"
        id={radioId}
        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
      {label && (
        <label htmlFor={radioId} className="text-sm text-neutral-700 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
});

Radio.displayName = "Radio";

/**
 * Form group component for organizing related form fields
 */
export function FormGroup({ className = "", children, ...props }) {
  return (
    <div className={`form-group ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Form actions component for submit/cancel buttons
 */
export function FormActions({ className = "", children, ...props }) {
  return (
    <div className={`form-actions ${className}`} {...props}>
      {children}
    </div>
  );
}
