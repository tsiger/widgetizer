import { nativeLanguageName } from "@widgetizer/core/languages";
import { useDefaultLanguage, useExtraLanguages, useIsMultilang } from "../../stores/projectStore";

/**
 * The language tabs above a content list — pages, menus, items. Renders nothing
 * while the site has one language, so a caller just places it and never asks.
 *
 * @param {string} value the language being looked at
 * @param {(code: string) => void} onChange
 * @param {string} label accessible name for the tablist
 */
export default function LanguageTabs({ value, onChange, label }) {
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  if (!isMultilang) return null;

  return (
    <div role="tablist" aria-label={label} className="mb-4 flex gap-1 border-b border-slate-200">
      {[defaultLanguage, ...extraLanguages].map((code) => (
        <button
          key={code}
          type="button"
          role="tab"
          aria-selected={value === code}
          onClick={() => onChange(code)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            value === code
              ? "border-pink-500 text-pink-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          {nativeLanguageName(code)}
          <span className="ml-1 text-xs text-slate-400">({code})</span>
        </button>
      ))}
    </div>
  );
}
