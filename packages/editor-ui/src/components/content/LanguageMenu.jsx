import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { nativeLanguageName } from "@widgetizer/core/languages";
import { useDefaultLanguage, useExtraLanguages, useIsMultilang } from "../../stores/projectStore";

/**
 * The language menu on the thing being edited — a page, a collection item. Shows
 * its own language; every other language either opens its sibling or creates it.
 * Renders nothing while the site has one language.
 *
 * @param {object} entry what is being edited (may be null while it loads)
 * @param {string} language the language it is in
 * @param {Map<string, object>} siblings the group, by language
 * @param {(sibling: object) => void} onOpen
 * @param {(entry: object, code: string) => void} onCreate
 * @param {string|null} pendingKey `${entry.id}:${code}` while one is being created
 * @param {string} label accessible name for the trigger
 */
export default function LanguageMenu({ entry, language, siblings, onOpen, onCreate, pendingKey, label }) {
  const { t } = useTranslation();
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isMultilang) return null;
  const current = language || defaultLanguage;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={label}
        aria-label={label}
        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100"
      >
        {nativeLanguageName(current)}
        <ChevronDown size={16} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-96 w-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {[defaultLanguage, ...extraLanguages].map((code) => {
            const sibling = siblings.get(code);
            const name = nativeLanguageName(code);
            if (sibling) {
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpen(sibling);
                  }}
                  aria-label={t("common.languages.open", { name })}
                  aria-current={code === current ? "true" : undefined}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left ${
                    code === current ? "bg-pink-600 text-white hover:bg-pink-700" : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span>{name}</span>
                  <span className="text-xs uppercase opacity-70">{code}</span>
                </button>
              );
            }
            return (
              <button
                key={code}
                type="button"
                disabled={!entry || pendingKey !== null}
                onClick={() => {
                  setIsOpen(false);
                  onCreate(entry, code);
                }}
                aria-label={
                  pendingKey === `${entry?.id}:${code}`
                    ? t("common.languages.creating", { name })
                    : t("common.languages.create", { name })
                }
                className="flex w-full items-center justify-between px-4 py-2 text-left text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Plus size={14} /> {name}
                </span>
                <span className="text-xs uppercase opacity-70">{code}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
