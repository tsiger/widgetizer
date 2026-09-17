import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { nativeLanguageName } from "@widgetizer/core/languages";
import { useDefaultLanguage, useExtraLanguages, useIsMultilang } from "../../stores/projectStore";

/**
 * One chip per language this row does NOT hold: filled opens the sibling that
 * exists, hollow creates the one that is missing. The whole translation workflow
 * for a list row, shared by pages and collection items.
 *
 * @param {object} entry the row
 * @param {Map<string, object>} siblings the group, by language (from useTranslationVersions)
 * @param {(sibling: object) => string} hrefOf where a sibling opens
 * @param {(entry: object, code: string) => void} onCreate
 * @param {string|null} pendingKey `${entry.id}:${code}` while one is being created
 */
export default function TranslationChips({ entry, siblings, hrefOf, onCreate, pendingKey }) {
  const { t } = useTranslation();
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  if (!isMultilang) return null;

  const own = entry.language || defaultLanguage;
  return (
    <div className="flex items-center gap-1">
      {[defaultLanguage, ...extraLanguages]
        .filter((code) => code !== own)
        .map((code) => {
          const sibling = siblings.get(code);
          const name = nativeLanguageName(code);
          if (sibling) {
            return (
              <Link
                key={code}
                to={hrefOf(sibling)}
                title={t("common.languages.open", { name })}
                aria-label={t("common.languages.open", { name })}
                className="rounded border border-pink-500 bg-pink-500 px-1.5 py-0.5 text-xs font-medium text-white transition-colors hover:bg-pink-600"
              >
                {code}
              </Link>
            );
          }
          return (
            <button
              key={code}
              type="button"
              disabled={pendingKey !== null}
              onClick={() => onCreate(entry, code)}
              title={t("common.languages.create", { name })}
              aria-label={
                pendingKey === `${entry.id}:${code}`
                  ? t("common.languages.creating", { name })
                  : t("common.languages.create", { name })
              }
              className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:border-pink-400 hover:text-pink-600 disabled:opacity-50"
            >
              {code}
            </button>
          );
        })}
    </div>
  );
}
