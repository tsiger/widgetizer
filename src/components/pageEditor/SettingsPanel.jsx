import { ArrowLeft } from "lucide-react";
import { SettingsRenderer } from "../settings";
import usePageStore from "../../stores/pageStore";
import useWidgetStore from "../../stores/widgetStore";
import useThemeStore from "../../stores/themeStore";
import useAutoSave from "../../stores/saveStore";
import { useTranslation } from "react-i18next";

export default function SettingsPanel({
  selectedWidget,
  selectedWidgetSchema,
  selectedWidgetId,
  selectedBlockId,
  selectedGlobalWidgetId,
  selectedThemeGroup,
  themeSettings,
  widgetSchemas,
  onBackToWidget,
}) {
  const { t } = useTranslation();
  const { globalWidgets } = usePageStore();
  const { updateWidgetSettings, updateGlobalWidgetSettings, updateBlockSettings } = useWidgetStore();
  const { updateThemeSetting } = useThemeStore();
  const { markWidgetModified, setThemeSettingsModified } = useAutoSave();

  const isGlobalWidget = !!selectedGlobalWidgetId;
  const isThemeSettings = !!selectedThemeGroup;
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

  const settings = isThemeSettings
    ? themeSettings?.settings?.global?.[selectedThemeGroup] || []
    : selectedBlockId && !isGlobalWidget
      ? selectedBlockSchema?.settings
      : currentWidgetSchema?.settings;

  const currentValues = isThemeSettings
    ? (themeSettings?.settings?.global?.[selectedThemeGroup] || []).reduce(
        (acc, s) => ({ ...acc, [s.id]: s.value }),
        {},
      )
    : selectedBlockId && !isGlobalWidget
      ? selectedBlock?.settings
      : currentWidget?.settings;

  if (!isThemeSettings && (!currentWidget || (!selectedWidgetId && !selectedGlobalWidgetId))) {
    return (
      <div className="w-60 bg-white border-l border-slate-200">
        <div className="p-4">
          <p className="text-slate-500 text-center mt-8">Select a widget to edit its settings</p>
        </div>
      </div>
    );
  }

  const handleSettingChange = (settingId, value) => {
    if (isThemeSettings) {
      updateThemeSetting(selectedThemeGroup, settingId, value);
      setThemeSettingsModified(true);
    } else if (isGlobalWidget) {
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

  // Calculate display name with priority: custom name > block name > widget schema name > fallback
  const displayName = isThemeSettings
    ? selectedThemeGroup.charAt(0).toUpperCase() + selectedThemeGroup.slice(1)
    : selectedBlockId && !isGlobalWidget
      ? selectedBlockSchema?.displayName || "Block Settings"
      : currentWidget?.settings?.name || // Use custom name if set
        currentWidgetSchema?.displayName ||
        (isGlobalWidget ? (selectedGlobalWidgetId === "header" ? "Header" : "Footer") : "Widget Settings");

  // Inject "name" setting for widgets (not blocks)
  const widgetNameSetting = {
    id: "name",
    type: "text",
    label: t("pageEditor.widgetName.label"),
    description: t("pageEditor.widgetName.description"),
    placeholder: t("pageEditor.widgetName.placeholder"),
  };

  // Combine name setting with other settings for widgets
  const allSettings = !isThemeSettings && !selectedBlockId && settings ? [widgetNameSetting, ...settings] : settings;

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
          {allSettings?.map((setting) => (
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
