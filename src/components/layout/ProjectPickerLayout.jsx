import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FolderOpen, Palette, Settings2 } from "lucide-react";
import Button from "../ui/Button";
import useProjectStore from "../../stores/projectStore";

export default function ProjectPickerLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const activeProject = useProjectStore((state) => state.activeProject);
  const utilityLinkClass = (path) =>
    `flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
      location.pathname === path
        ? "border-slate-500 bg-slate-800 text-white"
        : "border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <div className="relative z-30 flex flex-1 flex-col bg-slate-900 pr-0.5 pb-0.5 pt-0.5 md:pr-1 md:pb-1 md:pt-1">
        <header className="flex items-center justify-between px-4 py-4 text-white sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <Link to={activeProject ? "/pages" : "/projects"} className="flex items-center">
              <img src="/widgetizer_logo.svg" alt={t("common.appTitle")} className="h-8" />
            </Link>

            {activeProject && (
              <Link to="/pages">
                <Button variant="secondary" icon={<ArrowLeft size={16} />}>
                  {t("projects.backToWorkspace")}
                </Button>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link to="/projects" className={utilityLinkClass("/projects")}>
              <FolderOpen size={16} />
              <span>{t("navigation.projects")}</span>
            </Link>
            <Link to="/themes" className={utilityLinkClass("/themes")}>
              <Palette size={16} />
              <span>{t("navigation.themes")}</span>
            </Link>
            <Link to="/app-settings" className={utilityLinkClass("/app-settings")}>
              <Settings2 size={16} />
              <span>{t("navigation.appSettings")}</span>
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
