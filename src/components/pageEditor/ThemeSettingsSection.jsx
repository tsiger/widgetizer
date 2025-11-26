import { useState } from "react";
import { Palette } from "lucide-react";
import ThemeGroupItem from "./ThemeGroupItem";

export default function ThemeSettingsSection({ themeSettings, selectedThemeGroup, onThemeGroupSelect }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!themeSettings || !themeSettings.settings || !themeSettings.settings.global) {
    return null;
  }

  const themeGroups = Object.keys(themeSettings.settings.global);

  if (themeGroups.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-200">
      {/* Header */}
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Theme Settings</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Theme Groups List */}
      {isExpanded && (
        <div className="bg-slate-50">
          {themeGroups.map((groupKey) => (
            <ThemeGroupItem
              key={groupKey}
              groupKey={groupKey}
              groupName={groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}
              isSelected={selectedThemeGroup === groupKey}
              onClick={() => onThemeGroupSelect(groupKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
