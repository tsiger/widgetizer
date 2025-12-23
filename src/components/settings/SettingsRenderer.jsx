import { useTranslation } from "react-i18next";
import {
  TextInput,
  TextareaInput,
  ColorInput,
  RangeInput,
  SelectInput,
  CheckboxInput,
  RadioInput,
  FontPickerInput,
  MenuSelectInput,
  ImageInput,
  VideoInput,
  AudioInput,
  LinkInput,
  YouTubeInput,
  IconInput,
} from "./inputs";
import SettingsField from "./SettingsField";

/**
 * Renders the appropriate input component for a given setting
 */
export default function SettingsRenderer({ setting, value, onChange, error }) {
  const { t } = useTranslation();

  if (!setting || !setting.type) {
    return <div>Error: Invalid setting configuration.</div>;
  }

  const { type, id, label, description, options, min, max, step, unit } = setting;

  // Translate label and description if they are translation keys
  const translatedLabel = label?.startsWith("appSettings.") ? t(label) : label;
  const translatedDescription = description?.startsWith("appSettings.") ? t(description) : description;

  // Handle the new 'header' type, which acts as a section divider
  if (type === "header") {
    // The parent container is expected to have a `space-y-*` class,
    // which provides the margin-top to create space between this header
    // and the previous setting.
    // We add a top border and padding to visually separate the new section.
    return (
      <div className="border-t border-slate-300/70 pt-2">
        {translatedLabel && <h2 className="text-base font-semibold leading-7 text-slate-800">{translatedLabel}</h2>}
        {translatedDescription && <p className="mt-1 text-sm text-slate-500">{translatedDescription}</p>}
      </div>
    );
  }

  // Use the default value from the setting if the provided value is undefined
  const currentValue = value !== undefined ? value : setting.default;

  const inputProps = {
    id,
    value: currentValue,
    onChange: (newValue) => onChange(id, newValue),
    options,
    min,
    max,
    step,
    unit,
  };

  const renderInput = () => {
    switch (type) {
      case "text":
        return <TextInput {...inputProps} />;
      case "number":
        return <TextInput {...inputProps} type="number" />;
      case "textarea":
        return <TextareaInput {...inputProps} />;
      case "color":
        return <ColorInput {...inputProps} />;
      case "range":
        return <RangeInput {...inputProps} />;
      case "select":
        return <SelectInput {...inputProps} />;
      case "checkbox":
        // Checkbox needs boolean value
        return <CheckboxInput {...inputProps} value={!!currentValue} />;
      case "radio":
        return <RadioInput {...inputProps} />;
      case "font_picker":
        return <FontPickerInput {...inputProps} />;
      case "menu":
        return <MenuSelectInput {...inputProps} />;
      case "image":
        return <ImageInput {...inputProps} />;
      case "video":
        return <VideoInput {...inputProps} />;
      case "audio":
        return <AudioInput {...inputProps} />;
      case "link":
        return <LinkInput {...inputProps} />;
      case "youtube":
        return <YouTubeInput {...inputProps} setting={setting} />;
      case "icon":
        return (
          <IconInput
            {...inputProps}
            options={setting.options} // Pass explicit options if any
            allow_patterns={setting.allow_patterns} // Pass patterns if any
          />
        );
      default:
        return <div>Unsupported setting type: {type}</div>;
    }
  };

  const displayLabel = translatedLabel || id;

  return (
    <SettingsField id={id} label={displayLabel} description={translatedDescription} error={error} type={type}>
      {renderInput()}
    </SettingsField>
  );
}
