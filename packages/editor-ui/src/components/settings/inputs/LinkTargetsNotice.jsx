import { useTranslation } from "react-i18next";

/**
 * Shown with a link picker's list when its pages and items couldn't all be
 * loaded, so a short or empty list doesn't read as a site without pages. Typing
 * a URL still works, and a link already set is kept as it is.
 */
export default function LinkTargetsNotice({ onRetry }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="text-sm leading-5 text-red-700">
      <p>{t("components.linkTargets.loadFailed")}</p>
      <button type="button" className="mt-1 font-medium underline hover:text-red-900" onClick={onRetry}>
        {t("components.linkTargets.retry")}
      </button>
    </div>
  );
}
