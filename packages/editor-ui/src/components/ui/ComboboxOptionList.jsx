import { Fragment } from "react";

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
 * @param {object[]} options    Already-filtered options ({ value, label, group? }).
 * @param {(option: object) => void} onSelect  Called with the clicked option.
 * @param {string} emptyText    Shown when `options` is empty.
 * @param {string} [className]  Extra classes for the `<ul>` (e.g. the z-index hook).
 */
export default function ComboboxOptionList({ options, onSelect, emptyText, className = "" }) {
  return (
    <ul
      className={`absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm ${className}`}
    >
      {options.length > 0 ? (
        options.map((option, idx) => {
          // Header whenever the group changes between consecutive options.
          const showHeader = option.group && (idx === 0 || options[idx - 1].group !== option.group);
          return (
            <Fragment key={option.value}>
              {showHeader && (
                <li className="select-none px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {option.group}
                </li>
              )}
              <li
                onClick={() => onSelect(option)}
                className="relative cursor-default select-none py-2 pl-3 pr-9 text-slate-900 hover:bg-slate-100"
              >
                <span className="block truncate">{option.label}</span>
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
