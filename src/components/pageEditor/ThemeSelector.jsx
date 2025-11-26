import { useState, useRef, useEffect } from "react";
import { Palette, ChevronDown } from "lucide-react";
import useThemeStore from "../../stores/themeStore";
import useWidgetStore from "../../stores/widgetStore";

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { settings, originalSettings, hasUnsavedThemeChanges } = useThemeStore();
  const { selectedThemeGroup, setSelectedThemeGroup } = useWidgetStore();

  const themeGroups = settings?.settings?.global
    ? Object.keys(settings.settings.global).filter((key) => Array.isArray(settings.settings.global[key]))
    : [];

  // Check if a specific group has changes
  const hasGroupChanges = (group) => {
    if (!settings || !originalSettings || !settings.settings.global || !originalSettings.settings.global) return false;
    const currentGroup = settings.settings.global[group];
    const originalGroup = originalSettings.settings.global[group];
    return JSON.stringify(currentGroup) !== JSON.stringify(originalGroup);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGroupSelect = (group) => {
    setSelectedThemeGroup(group);
    setIsOpen(false);
  };

  const hasAnyChanges = hasUnsavedThemeChanges();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="font-medium px-4 py-2 rounded-sm hover:bg-slate-100 flex items-center gap-2"
      >
        <Palette size={16} />
        Theme
        {hasAnyChanges && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
        <ChevronDown size={16} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Theme Settings</p>
          </div>
          {themeGroups.map((group) => {
            const isChanged = hasGroupChanges(group);
            const isSelected = selectedThemeGroup === group;
            return (
              <button
                key={group}
                onClick={() => handleGroupSelect(group)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                  isSelected ? "bg-pink-600 text-white hover:bg-pink-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{group.charAt(0).toUpperCase() + group.slice(1)}</span>
                {isChanged && (
                  <div
                    className={`w-2 h-2 rounded-full ${isSelected ? "bg-pink-500 border border-white" : "bg-pink-500"}`}
                  ></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
