import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import useProjectStore from "../../stores/projectStore";

export default function ProjectPickerLayout() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((state) => state.activeProject);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <div className="relative z-30 flex flex-1 flex-col bg-slate-900 pr-0.5 pb-0.5 pt-0.5 md:pr-1 md:pb-1 md:pt-1">
        <header className="flex items-center justify-between px-4 py-4 text-white sm:px-6 md:px-8">
          <Link to={activeProject ? "/pages" : "/projects"} className="flex items-center">
            <img src="/widgetizer_logo.svg" alt={t("common.appTitle")} className="h-8" />
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {activeProject && (
              <Link to="/pages">
                <Button variant="secondary">{t("projects.backToWorkspace")}</Button>
              </Link>
            )}
            <Link to="/app-settings">
              <Button variant="secondary">{t("navigation.appSettings")}</Button>
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border-[10px] border-slate-900 bg-slate-900">
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-8 md:p-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
