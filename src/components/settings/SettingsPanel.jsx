import { useState } from "react";
import SettingsGroup from "./SettingsGroup";

/**
 * SettingsPanel component
 * Renders a panel with vertical tabs for different setting groups
 */
export default function SettingsPanel({ schema = {}, values = {}, onChange, errors = {} }) {
  const [activeTab, setActiveTab] = useState(Object.keys(schema)[0] || "");

  if (Object.keys(schema).length === 0) {
    return <div className="p-4 text-slate-500">No settings available</div>;
  }

  return (
    <div className="flex border-t border-slate-200">
      {/* Vertical tabs sidebar */}
      <div className="w-60 border-r border-slate-200 shrink-0">
        <div className="sticky top-0">
          {Object.keys(schema).map((tabKey) => (
            <button
              key={tabKey}
              className={`w-full text-left px-4 py-3 text-sm font-medium border-l-2 ${
                activeTab === tabKey
                  ? "border-pink-500 bg-pink-50 text-pink-600"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
              onClick={() => setActiveTab(tabKey)}
            >
              {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-6 min-h-[400px]">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
        </h2>
        <SettingsGroup settings={schema[activeTab]} values={values} onChange={onChange} errors={errors} />
      </div>
    </div>
  );
}
