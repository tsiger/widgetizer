import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <p>
        {t("layout.footer.thankYou")} <strong>Widgetizer {__APP_VERSION__}</strong>
      </p>
    </footer>
  );
}
