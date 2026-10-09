import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { nativeLanguageName, hreflangCase } from "@widgetizer/core/languages";
import { useIsMultilang } from "../../stores/projectStore";
import ComboboxOptionList from "../ui/ComboboxOptionList.jsx";

/**
 * The parent-page field. Pick-only, unlike the link picker's free-text box, but
 * it opens the same list: a language filter, "All", and a language badge on
 * every page, so two pages with one name in two languages can be told apart.
 *
 * Every language's pages are offered, because a language version keeps its
 * source's parent: a Greek page's parent is often the English page, and the
 * breadcrumb shows that parent's Greek version. The list therefore opens on the
 * selected parent's language, so the selection is in view, and otherwise on the
 * page's own.
 *
 * @param {string} id the button's id, for the field's label
 * @param {object[]} options `{ value: uuid, label, language }` per candidate page
 * @param {string} value the selected uuid, or "" for none
 * @param {(uuid: string) => void} onChange
 * @param {string} [language] the language of the page being edited
 */
export default function ParentPagePicker({ id, options, value, onChange, language }) {
  const { t } = useTranslation();
  const isMultilang = useIsMultilang();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const noneLabel = t("forms.page.parentPageNone");
  const selected = value ? options.find((option) => option.value === value) : null;
  // A parent that is not among the candidates (a page that has since gone) is
  // still what is stored; saying "None" would hide it.
  const shownLabel = selected ? selected.label : value ? t("forms.page.parentPageMissing") : noneLabel;

  return (
    <div
      className="relative"
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="form-select flex w-full items-center gap-2 text-left"
      >
        <span className="min-w-0 flex-1 truncate">{shownLabel}</span>
        {isMultilang && selected?.language && (
          <span
            title={nativeLanguageName(selected.language)}
            className="shrink-0 rounded border border-slate-200 px-1 text-xs text-slate-500"
          >
            {hreflangCase(selected.language)}
          </span>
        )}
      </button>
      {isOpen && (
        <ComboboxOptionList
          // Keyed by the selection's language: when the pages arrive after the
          // list was opened, it reopens on the language that shows the selection.
          key={selected?.language || ""}
          options={[{ value: "", label: noneLabel }, ...options]}
          onSelect={(option) => {
            onChange(option.value);
            setIsOpen(false);
            triggerRef.current?.focus();
          }}
          emptyText={noneLabel}
          className="z-10"
          initialLanguage={selected?.language || language}
          selectedValue={value || ""}
        />
      )}
    </div>
  );
}
