import { useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsRenderer from "./SettingsRenderer";

/**
 * AppSettingsPanel component
 * Renders app settings using JSON schema format with vertical tabs
 */
export default function AppSettingsPanel({ schema, settings, onChange }) {
  const { t } = useTranslation();

  // Group settings by tab from the schema
  const settingsByTab = {};

  Object.entries(schema.settings).forEach(([settingKey, config]) => {
    const tabName = config.tab || "general";

    if (!settingsByTab[tabName]) {
      settingsByTab[tabName] = [];
    }

    settingsByTab[tabName].push({
      key: settingKey,
      config: config,
    });
  });

  const [activeTab, setActiveTab] = useState(Object.keys(settingsByTab)[0] || "");

  if (Object.keys(settingsByTab).length === 0) {
    return <div className="p-4 text-slate-500">{t("appSettings.messages.noSettings")}</div>;
  }

  // Get nested value from settings object using dot notation
  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  // Render settings for the active tab
  const renderTabSettings = () => {
    const tabSettings = settingsByTab[activeTab] || [];
    let currentGroup = null;

    return tabSettings
      .map(({ key, config }) => {
        const elements = [];

        // Add group header if this is a new group
        if (config.group && config.group !== currentGroup && config.group !== "general") {
          currentGroup = config.group;
          const translatedGroup = config.group.startsWith("appSettings.") ? t(config.group) : config.group;
          elements.push(
            <div key={`header_${config.group}`} className="border-t border-slate-300/70 pt-2">
              <h2 className="text-base font-semibold leading-7 text-slate-800">{translatedGroup}</h2>
            </div>,
          );
        }

        // Get the current value for this setting
        const currentValue = getNestedValue(settings, key);
        const value = currentValue !== undefined ? currentValue : config.default;

        // Create the setting object for SettingsRenderer
        const setting = {
          id: key,
          type: config.type,
          label: config.label,
          description: config.description,
          default: config.default,
          min: config.min,
          max: config.max,
          step: config.step,
          unit: config.unit,
          options: config.options,
        };

        elements.push(<SettingsRenderer key={key} setting={setting} value={value} onChange={onChange} />);

        return elements;
      })
      .flat();
  };

  return (
    <div className="flex border-t border-slate-200">
      {/* Vertical tabs sidebar */}
      <div className="w-60 border-r border-slate-200 shrink-0">
        <div className="sticky top-0">
          {Object.keys(settingsByTab).map((tabKey) => (
            <button
              key={tabKey}
              className={`w-full text-left px-4 py-3 text-sm font-medium border-l-2 ${
                activeTab === tabKey
                  ? "border-pink-500 bg-pink-50 text-pink-600"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
              onClick={() => setActiveTab(tabKey)}
            >
              {t(`appSettings.tabs.${tabKey}.label`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-6 min-h-[400px]">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">
          {t(`appSettings.tabs.${activeTab}.label`)} {t("settings.title").split(" ")[1]}
        </h2>
        <div className="space-y-6">{renderTabSettings()}</div>
      </div>
    </div>
  );
}
