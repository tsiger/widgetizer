import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import AdminMenu from "./AdminMenu";
import useProjectStore from "../../stores/projectStore";
import DebugStatePanel from "../dev/DebugStatePanel";

export default function ProjectPickerLayout() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((state) => state.activeProject);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <DebugStatePanel />
      <div className="relative z-30 flex flex-1 flex-col bg-slate-900">
        <header className="flex items-start justify-between px-[18px] pb-0 pt-[18px] text-white">
          <div className="flex min-w-0 items-start gap-3 md:gap-4">
            <Link to={activeProject ? "/pages" : "/projects"} className="flex shrink-0 items-center pt-1">
              <img src="/widgetizer_logo.svg" alt={t("common.appTitle")} className="h-auto w-[var(--sidebar-logo-width)]" />
            </Link>

            {activeProject && (
              <Link
                to="/pages"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:outline-none focus:ring-0 focus:ring-offset-0"
              >
                <ArrowLeft size={16} />
                <span>{t("projects.backToWorkspace")}</span>
              </Link>
            )}
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <AdminMenu activeProject={activeProject} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border-[18px] border-slate-900 bg-slate-900">
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-8 md:p-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
