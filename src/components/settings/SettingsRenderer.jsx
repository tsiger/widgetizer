import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useThemeLocale } from "../../hooks/useThemeLocale";
import {
  TextInput,
  TextareaInput,
  CodeInput,
  ColorInput,
  RangeInput,
  RichTextInput,
  SelectInput,
  CheckboxInput,
  RadioInput,
  FontPickerInput,
  MenuSelectInput,
  ImageInput,
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
  const { tTheme } = useThemeLocale();

  const { type, id, label, description, options, min, max, step, unit, allow_alpha, language, size, compact } =
    setting || {};

  // Translate options (select/radio) via theme locale
  const translatedOptions = useMemo(() => {
    if (!Array.isArray(options)) return options;
    return options.map((opt) =>
      typeof opt === "object" && opt.label ? { ...opt, label: tTheme(opt.label) } : opt,
    );
  }, [options, tTheme]);

  if (!setting || !setting.type) {
    return <div>Error: Invalid setting configuration.</div>;
  }

  // Translate label and description — app settings use i18n keys, theme settings use tTheme
  const translatedLabel = label?.startsWith("appSettings.") ? t(label) : tTheme(label);
  const translatedDescription = description?.startsWith("appSettings.") ? t(description) : tTheme(description);

  // Handle the new 'header' type, which acts as a section divider
  if (type === "header") {
    return (
      <div className={`setting-type-header pt-2`}>
        {translatedLabel && <h2 className="text-sm font-semibold leading-7 text-slate-800">{translatedLabel}</h2>}
        {translatedDescription && <p className="mt-1 text-sm text-slate-500">{translatedDescription}</p>}
      </div>
    );
  }

  const currentValue = value !== undefined ? value : setting.default;

  const inputProps = {
    id,
    value: currentValue,
    onChange: (newValue) => onChange(id, newValue),
    options: translatedOptions,
    min,
    max,
    step,
    unit,
    allow_alpha,
  };

  const renderInput = () => {
    switch (type) {
      case "text":
        return <TextInput {...inputProps} />;
      case "number":
        return <TextInput {...inputProps} type="number" />;
      case "textarea":
        return <TextareaInput {...inputProps} />;
      case "richtext":
        return <RichTextInput {...inputProps} placeholder={setting.placeholder} allowSource={setting.allow_source} />;
      case "code":
        return <CodeInput {...inputProps} language={language || "html"} rows={setting.rows || 10} />;
      case "color":
        return <ColorInput {...inputProps} />;
      case "range":
        return <RangeInput {...inputProps} />;
      case "select":
        return <SelectInput {...inputProps} />;
      case "checkbox":
        // Convert to boolean - React checkboxes require boolean, not truthy values
        return <CheckboxInput {...inputProps} value={!!currentValue} />;
      case "radio":
        return <RadioInput {...inputProps} />;
      case "font_picker":
        return <FontPickerInput {...inputProps} />;
      case "menu":
        return <MenuSelectInput {...inputProps} />;
      case "image": {
        // `size` replaces legacy `compact` for image width; prefer `size` when both exist
        const imageSize = size || (compact ? "narrow" : "full");
        return <ImageInput {...inputProps} size={imageSize} />;
      }
      case "link":
        return <LinkInput {...inputProps} setting={setting} />;
      case "youtube":
        return <YouTubeInput {...inputProps} setting={setting} />;
      case "icon":
        return (
          <IconInput
            {...inputProps}
            options={setting.options} // Pass explicit options if any
            allow_patterns={setting.allow_patterns} // Pass patterns if any
            defaultValue={setting.default} // Pass default to compare
          />
        );
      default:
        return <div>Unsupported setting type: {type}</div>;
    }
  };

  const displayLabel = translatedLabel || id;

  return (
    <div className={`setting-type-${type}`}>
      <SettingsField id={id} label={displayLabel} description={translatedDescription} error={error} type={type}>
        {renderInput()}
      </SettingsField>
    </div>
  );
}
