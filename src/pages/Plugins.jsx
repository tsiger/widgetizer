import { useTranslation } from "react-i18next";
import { Puzzle } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";

export default function Plugins() {
  const { t } = useTranslation();
  return (
    <PageLayout title={t("plugins.title")}>
      <div className="p-8 text-center">
        <Puzzle className="mx-auto mb-4 text-slate-400" size={48} />
        <h2 className="text-xl font-semibold mb-2">{t("plugins.emptyTitle")}</h2>
        <p className="text-slate-600 mb-4">
          {t("plugins.emptyDesc")}
        </p>
      </div>
    </PageLayout>
  );
}
