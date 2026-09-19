import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useThemeLocale } from "../../hooks/useThemeLocale";
import {
  TextInput,
  TextareaInput,
  CodeInput,
  ColorInput,
  DateInput,
  RangeInput,
  RichTextInput,
  SelectInput,
  CheckboxInput,
  RadioInput,
  FileInput,
  FontPickerInput,
  GalleryInput,
  MenuSelectInput,
  ImageInput,
  TableInput,
  LinkInput,
  YouTubeInput,
  IconInput,
} from "./inputs";
import SettingsField from "./SettingsField";

/**
 * Renders the appropriate input component for a given setting
 */
export default function SettingsRenderer({
  setting,
  value,
  onChange,
  error,
  allowExpand = false,
  resizable = false,
  allowInternalLinkTargets = false,
}) {
  const { t } = useTranslation();
  const { tTheme } = useThemeLocale();

  const { type, id, label, description, required, options, min, max, step, unit, allow_alpha, language, size, compact, layout } =
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

  // A setting whose default is one of the theme's own words carries it as
  // `resolvedDefault`, in the language being edited. It wins over the literal
  // beside it, because that literal is the same word in the theme author's
  // language — showing it would tell the owner their Greek page starts in
  // English when it does not.
  const effectiveDefault = setting.resolvedDefault !== undefined ? setting.resolvedDefault : setting.default;
  const currentValue = value !== undefined ? value : effectiveDefault;

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
      case "date":
        return <DateInput {...inputProps} />;
      case "textarea":
        return <TextareaInput {...inputProps} />;
      case "richtext":
        return (
          <RichTextInput
            {...inputProps}
            placeholder={setting.placeholder}
            allowSource={setting.allow_source}
            allowHeadings={setting.allow_headings}
            allowImages={setting.allow_images}
            allowInternalLinkTargets={allowInternalLinkTargets}
            minHeight={setting.min_height}
          />
        );
      case "code":
        return <CodeInput {...inputProps} language={language || "html"} rows={setting.rows || 10} allowExpand={allowExpand} resizable={resizable} />;
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
        // Prefer `size` over `compact` when both image-width fields exist.
        const imageSize = size || (compact ? "narrow" : "full");
        // `layout` ("stacked" default | "row") drives the editor's input shape — a big
        // full-width preview vs. a compact thumbnail with the controls beside it.
        return <ImageInput {...inputProps} size={imageSize} layout={layout} framed={layout === "row"} />;
      }
      case "gallery":
        return <GalleryInput {...inputProps} />;
      case "table":
        return <TableInput {...inputProps} columns={setting.columns} />;
      case "file":
        return <FileInput {...inputProps} />;
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
            defaultValue={effectiveDefault} // Pass default to compare
          />
        );
      default:
        return <div>Unsupported setting type: {type}</div>;
    }
  };

  const displayLabel = translatedLabel || id;

  return (
    <div className={`setting-type-${type}`}>
      <SettingsField id={id} label={displayLabel} description={translatedDescription} error={error} type={type} required={required}>
        {renderInput()}
      </SettingsField>
    </div>
  );
}
