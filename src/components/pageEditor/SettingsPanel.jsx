import { ArrowLeft } from "lucide-react";
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
  SettingsField,
} from "../settings";

export default function SettingsPanel({
  selectedWidget,
  selectedWidgetSchema,
  selectedWidgetId,
  selectedBlockId,
  onSettingChange,
  onBlockSettingChange,
  onBackToWidget,
}) {
  // Get the selected block if any
  const selectedBlock = selectedBlockId && selectedWidget?.blocks?.[selectedBlockId];
  const selectedBlockSchema =
    selectedBlock && selectedWidgetSchema?.blocks?.find((block) => block.type === selectedBlock.type);

  // Use block settings if a block is selected, otherwise use widget settings
  const settings = selectedBlockId ? selectedBlockSchema?.settings : selectedWidgetSchema?.settings;
  const currentValues = selectedBlockId ? selectedBlock?.settings : selectedWidget?.settings;

  if (!selectedWidget || !selectedWidgetId) {
    return (
      <div className="w-72 bg-white border-l border-slate-200">
        <div className="p-4">
          <p className="text-slate-500 text-center mt-8">Select a widget to edit its settings</p>
        </div>
      </div>
    );
  }

  // Render the appropriate input component based on setting type
  const renderInput = (setting, value, onChange) => {
    const { type, id, options, min, max, step, label, description } = setting;

    switch (type) {
      case "text":
        return <TextInput value={value || ""} onChange={(e) => onChange(id, e)} />;
      case "textarea":
        return <TextareaInput value={value || ""} onChange={(e) => onChange(id, e)} />;
      case "color":
        return <ColorInput value={value || ""} onChange={(color) => onChange(id, color)} />;
      case "range":
        return <RangeInput value={value || 0} min={min} max={max} step={step} onChange={(val) => onChange(id, val)} />;
      case "select":
        return <SelectInput value={value || ""} options={options} onChange={(val) => onChange(id, val)} />;
      case "checkbox":
        return (
          <CheckboxInput
            id={id}
            label={label}
            description={description}
            value={!!value}
            onChange={(checked) => onChange(id, checked)}
          />
        );
      case "radio":
        return <RadioInput value={value || ""} options={options} onChange={(val) => onChange(id, val)} />;
      case "font_picker":
        return <FontPickerInput value={value} onChange={(fontObject) => onChange(id, fontObject)} />;
      case "image":
        return <ImageInput value={value || ""} onChange={(val) => onChange(id, val)} />;
      case "menu":
        return <MenuSelectInput value={value || ""} onChange={(val) => onChange(id, val)} />;
      default:
        return <div>Unsupported setting type: {type}</div>;
    }
  };

  return (
    <div className="w-72 bg-white border-l border-slate-200 flex flex-col h-full">
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="font-bold mb-4 sticky top-0 bg-white pb-2 border-b border-slate-100 z-10">
          {selectedBlockId ? (
            <div className="flex items-center gap-2">
              <button onClick={onBackToWidget} className="p-1 hover:bg-slate-100 rounded-sm text-slate-500">
                <ArrowLeft size={16} />
              </button>
              <span>{selectedBlockSchema?.displayName || "Block Settings"}</span>
            </div>
          ) : (
            selectedWidgetSchema.displayName
          )}
        </div>

        <div className="space-y-6">
          {settings?.map((setting) => {
            const value = currentValues?.[setting.id] !== undefined ? currentValues[setting.id] : setting.default;

            return (
              <div key={setting.id}>
                <SettingsField label={setting.label} description={setting.description} type={setting.type}>
                  {renderInput(setting, value, (settingId, value) => {
                    if (selectedBlockId) {
                      onBlockSettingChange(selectedWidgetId, selectedBlockId, settingId, value);
                    } else {
                      onSettingChange(selectedWidgetId, settingId, value);
                    }
                  })}
                </SettingsField>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
