import { useState, useRef, useEffect } from "react";
import { Palette, ChevronDown } from "lucide-react";
import useThemeStore from "../../stores/themeStore";
import useWidgetStore from "../../stores/widgetStore";

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { settings } = useThemeStore();
  const { selectedThemeGroup, setSelectedThemeGroup } = useWidgetStore();

  const themeGroups = settings?.settings?.global
    ? Object.keys(settings.settings.global).filter((key) => Array.isArray(settings.settings.global[key]))
    : [];

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          selectedThemeGroup
            ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <Palette size={16} />
        <span>Theme</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Theme Settings</p>
          </div>
          {themeGroups.map((group) => (
            <button
              key={group}
              onClick={() => handleGroupSelect(group)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                selectedThemeGroup === group ? "text-blue-600 font-medium bg-blue-50" : "text-slate-700"
              }`}
            >
              {group.charAt(0).toUpperCase() + group.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
