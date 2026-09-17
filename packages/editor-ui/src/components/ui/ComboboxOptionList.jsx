import { Fragment, useState } from "react";
import { nativeLanguageName } from "@widgetizer/core/languages";
import { useDefaultLanguage, useExtraLanguages, useIsMultilang } from "../../stores/projectStore";
import { useEditingLanguage } from "../../lib/editingLanguage.jsx";

/**
 * Shared dropdown list body for the combobox components (`ui/Combobox` and
 * `menus/MenuEditor/MenuCombobox`). Both pickers differ only in their open-state
 * strategy (self-owned vs externally controlled) — the rendered `<ul>` of options,
 * group headers, and empty state is identical, so it lives here once.
 *
 * Emits an uppercase section header whenever the `group` field changes between
 * consecutive options (e.g. a "Pages" group + one per collection, via
 * `useLinkTargets`). Ungrouped options render flat with no header.
 *
 * On a multilingual site it also owns the language filter: every language is
 * offered, because a page may exist in only one of them, but the view opens on the
 * language being edited so the common case stays one click. A target in another
 * language is labelled rather than hidden — a tag, not a warning.
 *
 * @param {object[]} options    Already-filtered options ({ value, label, group?, language? }).
 * @param {(option: object) => void} onSelect  Called with the clicked option.
 * @param {string} emptyText    Shown when `options` is empty.
 * @param {string} [className]  Extra classes for the `<ul>` (e.g. the z-index hook).
 */
const ALL_LANGUAGES = "*";

export default function ComboboxOptionList({ options, onSelect, emptyText, className = "" }) {
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  const editingLanguage = useEditingLanguage();

  const siteLanguages = [defaultLanguage, ...extraLanguages];
  // Reopening the picker returns to the language being edited, which is the point
  // of the default — the filter is a detour, not a setting.
  const [language, setLanguage] = useState(() =>
    siteLanguages.includes(editingLanguage) ? editingLanguage : defaultLanguage,
  );

  // An option with no language at all (any non-link picker) is never filtered out.
  const visible =
    !isMultilang || language === ALL_LANGUAGES
      ? options
      : options.filter((option) => !option.language || option.language === language);

  // The language only enters the header when several of them are on screen.
  const headerOf = (option) =>
    option.group && isMultilang && language === ALL_LANGUAGES && option.language
      ? `${option.group} · ${nativeLanguageName(option.language)}`
      : option.group;

  return (
    <ul
      className={`absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm ${className}`}
    >
      {isMultilang && (
        <li role="presentation" className="flex flex-wrap gap-1 border-b border-slate-100 px-2 pb-2 pt-1">
          {[...siteLanguages, ALL_LANGUAGES].map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={language === code}
              onClick={() => setLanguage(code)}
              className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase transition-colors ${
                language === code
                  ? "bg-pink-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {code === ALL_LANGUAGES ? "All" : code}
            </button>
          ))}
        </li>
      )}
      {visible.length > 0 ? (
        visible.map((option, idx) => {
          // Header whenever the group changes between consecutive options.
          const header = headerOf(option);
          const showHeader = header && (idx === 0 || headerOf(visible[idx - 1]) !== header);
          const elsewhere = isMultilang && option.language && option.language !== editingLanguage;
          return (
            <Fragment key={option.value}>
              {showHeader && (
                <li className="select-none px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {header}
                </li>
              )}
              <li
                onClick={() => onSelect(option)}
                className="relative flex cursor-default select-none items-center justify-between gap-2 py-2 pl-3 pr-9 text-slate-900 hover:bg-slate-100"
              >
                <span className="block truncate">{option.label}</span>
                {elsewhere && (
                  <span
                    title={nativeLanguageName(option.language)}
                    className="shrink-0 rounded border border-slate-200 px-1 text-xs uppercase text-slate-500"
                  >
                    {option.language}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })
      ) : (
        <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-slate-500">{emptyText}</li>
      )}
    </ul>
  );
}
