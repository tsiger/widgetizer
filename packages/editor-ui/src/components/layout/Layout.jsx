import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";
import Sidebar from "./Sidebar";
import { SlotOutlet } from "../../extension/PluginProvider.jsx";

// Editor chrome shared by both shells. Shell-specific chrome (the admin menu,
// the desktop update banner, the dev state overlay) is injected by the host
// through named slots rather than imported here — keeping Layout free of any
// OSS- or hosted-only dependency. EditorShell renders this inside a
// <PluginProvider>, so the slot outlets resolve to whatever the shell provided.
export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";
  const activeProject = useProjectStore((state) => state.activeProject);

  return (
    <div className="flex h-screen overflow-hidden">
      {!isPageEditor && <Sidebar />}
      <SlotOutlet name="overlay" />

      <div
        className={`relative z-30 flex flex-1 flex-col ${
          !isPageEditor ? "ml-[72px] bg-slate-900 md:ml-[var(--sidebar-width)]" : ""
        }`}
      >
        <SlotOutlet name="topbarBanner" />

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
              <SlotOutlet name="topbarRight" />
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
