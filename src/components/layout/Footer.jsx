import Breadcrumb from "./Breadcrumb";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import useAppInfoStore from "../../stores/appInfoStore";
import useProjectStore from "../../stores/projectStore";

export default function Footer() {
  const { t } = useTranslation();
  const hostedMode = useAppInfoStore((state) => state.hostedMode);
  const activeProject = useProjectStore((state) => state.activeProject);
  // Only show the published URL link after the site is actually live (publishedAt set).
  // Draft registration sets publishedUrl but not publishedAt — the subdomain has no files yet.
  const publishedUrl = activeProject?.publishedAt ? activeProject?.publishedUrl : null;

  return (
    <footer className="bg-white px-4 py-2 flex justify-between items-center text-xs border-t border-slate-200 rounded-bl-lg rounded-br-lg">
      {hostedMode && publishedUrl ? (
        <a
          href={publishedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-pink-600 hover:text-pink-700 font-mono truncate max-w-[300px]"
          title={publishedUrl}
        >
          {publishedUrl.replace(/^https?:\/\//, "")}
          <ExternalLink size={12} className="shrink-0" />
        </a>
      ) : (
        <Breadcrumb />
      )}
      <div className="flex items-center gap-3">
        <p>
          {t("layout.footer.thankYou")} <strong>Widgetizer {__APP_VERSION__}</strong>
        </p>
      </div>
    </footer>
  );
}
