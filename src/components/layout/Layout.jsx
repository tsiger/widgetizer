import Sidebar from "./Sidebar";
import Footer from "./Footer";
import UpdateBanner from "./UpdateBanner";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderOpen, Settings2 } from "lucide-react";
import useProjectStore from "../../stores/projectStore";

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";
  const activeProject = useProjectStore((state) => state.activeProject);
  const projectPickerHref = `/projects?next=${encodeURIComponent(location.pathname)}`;
  const appSettingsActive = location.pathname === "/app-settings";

  const utilityLinkClass =
    "group inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white";
  const shellLinkClass = (active = false) =>
    `flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-slate-500 bg-slate-800 text-white"
        : "border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="flex h-screen overflow-hidden">
      {!isPageEditor && <Sidebar />}

      <div
        className={`relative z-30 flex flex-1 flex-col ${
          !isPageEditor ? "ml-[72px] md:ml-56 bg-slate-900 pr-0.5 pb-0.5 pt-0.5 md:pr-1 md:pb-1 md:pt-1" : ""
        }`}
      >
        <UpdateBanner />

        {!isPageEditor && (
          <header className="flex items-center justify-between px-4 py-4 text-white sm:px-6 md:px-8">
            <div className="flex min-w-0 items-center gap-4">
              {activeProject && (
                <>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">{t("sidebar.currentProject")}</p>
                    <p className="truncate text-base font-semibold text-white">{activeProject.name}</p>
                  </div>
                  <Link to={projectPickerHref} className={utilityLinkClass}>
                    <FolderOpen size={16} className="text-slate-400 transition-colors group-hover:text-pink-600" />
                    <span>{t("sidebar.manageProjects")}</span>
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!activeProject && (
                <Link to={projectPickerHref} className={utilityLinkClass}>
                  <FolderOpen size={16} className="text-slate-400 transition-colors group-hover:text-pink-600" />
                  <span>{t("sidebar.manageProjects")}</span>
                </Link>
              )}
              <Link to="/app-settings" className={shellLinkClass(appSettingsActive)}>
                <Settings2 size={16} />
                <span>{t("navigation.appSettings")}</span>
              </Link>
            </div>
          </header>
        )}

        <div
          className={`flex flex-1 flex-col min-h-0 ${
            isPageEditor
              ? "overflow-hidden"
              : "overflow-hidden rounded-[18px] border-[10px] border-slate-900 bg-slate-900"
          }`}
        >
          <div
            className={`flex-1 min-h-0 ${
              isPageEditor ? "overflow-hidden" : "overflow-y-auto bg-slate-100 p-8 md:p-10"
            }`}
          >
            <Outlet />
          </div>

          {!isPageEditor && <Footer />}
        </div>
      </div>
    </div>
  );
}
