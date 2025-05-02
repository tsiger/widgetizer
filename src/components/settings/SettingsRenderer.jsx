import ColorInput from "./inputs/ColorInput";
import TextInput from "./inputs/TextInput";
import FontPickerInput from "./inputs/FontPickerInput";
import RangeInput from "./inputs/RangeInput";
import SelectInput from "./inputs/SelectInput";
import CheckboxInput from "./inputs/CheckboxInput";
import RadioInput from "./inputs/RadioInput";
import TextareaInput from "./inputs/TextareaInput";
import SettingsField from "./SettingsField";

// Map of setting types to their respective components
const SETTING_COMPONENTS = {
  color: ColorInput,
  text: TextInput,
  font_picker: FontPickerInput,
  range: RangeInput,
  select: SelectInput,
  checkbox: CheckboxInput,
  radio: RadioInput,
  textarea: TextareaInput,
  number: TextInput,
  email: TextInput,
  url: TextInput,
};

// Map of setting types to their HTML input types
const INPUT_TYPES = {
  text: "text",
  number: "number",
  email: "email",
  url: "url",
};

/**
 * SettingsRenderer component
 * Renders the appropriate input component based on setting type
 */
export default function SettingsRenderer({ settings = [], values = {}, onChange, errors = {} }) {
  return (
    <div>
      {settings.map((setting) => {
        const Component = SETTING_COMPONENTS[setting.type];

        if (!Component) {
          console.warn(`No component found for setting type: ${setting.type}`);
          return null;
        }

        const currentValue = values[setting.id] !== undefined ? values[setting.id] : setting.default;
        const componentOnChange = (newValue) => onChange(setting.id, newValue);

        // Special handling for CheckboxInput as it doesn't wrap itself
        if (setting.type === "checkbox") {
          return (
            <SettingsField
              key={setting.id}
              id={setting.id}
              label={setting.label}
              description={setting.description}
              error={errors[setting.id]}
              type={setting.type}
            >
              <Component value={!!currentValue} onChange={componentOnChange} />
            </SettingsField>
          );
        }

        // Create props object WITHOUT the key property
        const componentProps = {
          id: setting.id,
          label: setting.label,
          value: currentValue,
          onChange: componentOnChange,
          description: setting.description,
          error: errors[setting.id],
          // Include the appropriate input type
          ...(INPUT_TYPES[setting.type] && { type: INPUT_TYPES[setting.type] }),
          // Include all other properties from the setting object
          ...(setting.options && { options: setting.options }),
          ...(setting.min !== undefined && { min: setting.min }),
          ...(setting.max !== undefined && { max: setting.max }),
          ...(setting.step !== undefined && { step: setting.step }),
          ...setting.props, // Pass any additional props
        };

        // Pass key directly to the JSX element, not in the spread props
        return <Component key={setting.id} {...componentProps} />;
      })}
    </div>
  );
}
