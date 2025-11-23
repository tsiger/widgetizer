import { ArrowLeft } from "lucide-react";
import { SettingsRenderer } from "../settings";
import usePageStore from "../../stores/pageStore";
import useWidgetStore from "../../stores/widgetStore";
import useAutoSave from "../../stores/saveStore";

export default function SettingsPanel({
  selectedWidget,
  selectedWidgetSchema,
  selectedWidgetId,
  selectedBlockId,
  selectedGlobalWidgetId,
  widgetSchemas,
  onBackToWidget,
}) {
  const { globalWidgets } = usePageStore();
  const { updateWidgetSettings, updateGlobalWidgetSettings, updateBlockSettings } = useWidgetStore();
  const { markWidgetModified } = useAutoSave();

  const isGlobalWidget = !!selectedGlobalWidgetId;
  const globalWidget = isGlobalWidget ? globalWidgets[selectedGlobalWidgetId] : null;

  const currentWidget = isGlobalWidget ? globalWidget : selectedWidget;
  const currentWidgetSchema = isGlobalWidget
    ? globalWidget
      ? widgetSchemas?.[globalWidget.type] || {}
      : null
    : selectedWidgetSchema;

  const selectedBlock = !isGlobalWidget && selectedBlockId && selectedWidget?.blocks?.[selectedBlockId];
  const selectedBlockSchema =
    !isGlobalWidget &&
    selectedBlock &&
    selectedWidgetSchema?.blocks?.find((block) => block.type === selectedBlock.type);

  const settings = selectedBlockId && !isGlobalWidget ? selectedBlockSchema?.settings : currentWidgetSchema?.settings;
  const currentValues = selectedBlockId && !isGlobalWidget ? selectedBlock?.settings : currentWidget?.settings;

  if (!currentWidget || (!selectedWidgetId && !selectedGlobalWidgetId)) {
    return (
      <div className="w-60 bg-white border-l border-slate-200">
        <div className="p-4">
          <p className="text-slate-500 text-center mt-8">Select a widget to edit its settings</p>
        </div>
      </div>
    );
  }

  const handleSettingChange = (settingId, value) => {
    if (isGlobalWidget) {
      updateGlobalWidgetSettings(selectedGlobalWidgetId, settingId, value);
      markWidgetModified(selectedGlobalWidgetId);
    } else if (selectedBlockId) {
      updateBlockSettings(selectedWidgetId, selectedBlockId, settingId, value);
      markWidgetModified(selectedWidgetId);
    } else {
      updateWidgetSettings(selectedWidgetId, settingId, value);
      markWidgetModified(selectedWidgetId);
    }
  };

  const displayName =
    selectedBlockId && !isGlobalWidget
      ? selectedBlockSchema?.displayName || "Block Settings"
      : currentWidgetSchema?.displayName ||
        (isGlobalWidget ? (selectedGlobalWidgetId === "header" ? "Header" : "Footer") : "Widget Settings");

  return (
    <div className="w-60 bg-white border-l border-slate-200 flex flex-col h-full">
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="font-bold mb-4 sticky top-0 bg-white pb-2 border-b border-slate-100 z-10">
          {selectedBlockId && !isGlobalWidget ? (
            <div className="flex items-center gap-2">
              <button onClick={onBackToWidget} className="p-1 hover:bg-slate-100 rounded-sm text-slate-500">
                <ArrowLeft size={16} />
              </button>
              <span>{displayName}</span>
            </div>
          ) : (
            <span>{displayName}</span>
          )}
        </div>

        <div className="space-y-6">
          {settings?.map((setting) => (
            <SettingsRenderer
              key={setting.id}
              setting={setting}
              value={currentValues?.[setting.id]}
              onChange={handleSettingChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
