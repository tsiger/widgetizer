import Sidebar from "./Sidebar";
import UpdateBanner from "./UpdateBanner";
import AdminMenu from "./AdminMenu";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";
  const activeProject = useProjectStore((state) => state.activeProject);

  return (
    <div className="flex h-screen overflow-hidden">
      {!isPageEditor && <Sidebar />}

      <div
        className={`relative z-30 flex flex-1 flex-col ${
          !isPageEditor ? "ml-[72px] bg-slate-900 md:ml-[var(--sidebar-width)]" : ""
        }`}
      >
        <UpdateBanner />

        {!isPageEditor && (
          <header className="flex items-center justify-between px-[18px] pb-0 pt-[18px] text-white">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              {activeProject && (
                <div className="min-w-0 leading-none">
                  <p className="text-xs font-bold uppercase text-slate-500">{t("sidebar.currentProject")}</p>
                  <p className="text-lg font-semibold leading-tight text-white">{activeProject.name}</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AdminMenu activeProject={activeProject} />
            </div>
          </header>
        )}

        <div
          className={`flex flex-1 flex-col min-h-0 ${
            isPageEditor
              ? "overflow-hidden"
              : "overflow-hidden rounded-[22px] border-[18px] border-slate-900 bg-slate-900"
          }`}
        >
          <div
            className={`flex-1 min-h-0 ${
              isPageEditor ? "overflow-hidden" : "overflow-y-auto bg-slate-100 p-8 md:p-10"
            }`}
          >
            <Outlet />
          </div>

        </div>
      </div>
    </div>
  );
}
