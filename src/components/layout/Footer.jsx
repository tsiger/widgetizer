import Breadcrumb from "./Breadcrumb";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-white px-4 py-2 flex justify-between items-center text-xs border-t border-slate-200 rounded-bl-lg rounded-br-lg">
      <Breadcrumb />
      <p>
        {t("layout.footer.thankYou")} <strong>Widgetizer {__APP_VERSION__}</strong>
      </p>
    </footer>
  );
}
