import Breadcrumb from "./Breadcrumb";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <Breadcrumb />
      <div className="flex items-center gap-3">
        <p>
          {t("layout.footer.thankYou")} <strong>Widgetizer {__APP_VERSION__}</strong>
        </p>
      </div>
    </footer>
  );
}
