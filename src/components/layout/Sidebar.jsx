import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, FolderOpen, Settings2 } from "lucide-react";
import useProjectStore from "../../stores/projectStore";
import { navigationSections } from "../../config/navigation";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { activeProject } = useProjectStore();
  const hasActiveProject = !!activeProject;

  const projectPickerHref = `/projects?next=${encodeURIComponent(location.pathname)}`;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const linkClass = (path, disabled = false) =>
    `group flex items-center justify-center rounded-sm border p-2 transition-all duration-150 md:justify-start ${
      disabled
        ? "cursor-not-allowed opacity-40"
        : isActive(path)
          ? "border-pink-600 bg-pink-600"
          : "border-slate-700 hover:bg-slate-800 md:border-none"
    } ${disabled ? "" : !isActive(path) ? "text-slate-400 hover:text-white" : "text-white"}`;

  const iconClass = (path, disabled = false) =>
    `flex h-8 w-8 items-center justify-center md:h-4 md:w-4 ${
      disabled
        ? "text-slate-500"
        : isActive(path)
          ? "text-white"
          : "text-slate-400 transition-colors group-hover:text-pink-600"
    }`;

  const navLabelClass = (path, disabled = false) =>
    `ml-1 hidden text-sm md:inline ${
      disabled ? "text-slate-500" : isActive(path) ? "text-white" : "text-slate-300 transition-colors group-hover:text-white"
    }`;

  const utilityLinkClass =
    "group flex items-center justify-center gap-2 rounded-md px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:justify-start";
  const utilityIconClass = "text-slate-400 transition-colors group-hover:text-pink-600";

  const NavLink = ({ to, children, disabled = false, ...props }) => (
    <Link
      to={disabled ? "#" : to}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
        }
      }}
      {...props}
    >
      {children}
    </Link>
  );

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const disabled = item.requiresProject && !hasActiveProject;

    return (
      <li key={item.id}>
        <NavLink to={item.path} className={linkClass(item.path, disabled)} disabled={disabled}>
          <div className={iconClass(item.path, disabled)}>
            <Icon size={20} />
          </div>
          <span className={navLabelClass(item.path, disabled)}>{t(item.labelKey)}</span>
        </NavLink>
      </li>
    );
  };

  const renderSection = (section) => {
    if (section.position === "bottom") {
      return (
        <div key={section.id} className="border-t border-slate-800 pt-4">
          <h3 className="ml-2 mb-2 hidden text-xs font-bold text-slate-600 md:block">{t(section.titleKey)}</h3>
          <ul className="space-y-2 md:space-y-1">{section.items.map(renderNavItem)}</ul>
        </div>
      );
    }

    return (
      <div key={section.id} className="mb-4 border-b border-slate-800 pb-4">
        {section.titleKey && <h3 className="ml-2 mb-2 hidden text-xs font-bold text-slate-600 md:block">{t(section.titleKey)}</h3>}
        <ul className="space-y-2 md:space-y-1">{section.items.map(renderNavItem)}</ul>
      </div>
    );
  };

  const topSections = navigationSections.filter((section) => section.position !== "bottom");
  const bottomSections = navigationSections.filter((section) => section.position === "bottom");

  return (
    <div className="fixed left-0 top-0 flex h-screen w-[72px] flex-col overflow-y-auto bg-slate-900 text-white md:w-56">
      <div className="grow px-2 pb-2 md:px-4">
        <div className="mb-4 border-b border-slate-800 py-0 pb-2 md:py-4">
          <img src="/widgetizer_logo.svg" alt={t("common.appTitle")} className="hidden h-8 md:block" />
          <img src="/widgetizer_symbol.svg" alt={t("common.appTitle")} className="mx-auto h-12 w-12 md:hidden" />
        </div>

        {activeProject && (
          <div className="mb-3 border-b border-slate-800 pb-3">
            <h3 className="ml-2 mb-1 hidden text-xs font-bold text-slate-500 md:block">{t("sidebar.currentProject")}</h3>
            <p className="hidden truncate px-2 text-[17px] leading-tight font-semibold text-white md:block">{activeProject.name}</p>
            <Link to={projectPickerHref} className="group mt-1.5 hidden items-center justify-between rounded-md px-2 py-2 md:flex">
              <span className="flex items-center gap-2 text-sm text-slate-400 transition-colors group-hover:text-white">
                <FolderOpen size={16} className={utilityIconClass} />
                {t("sidebar.manageProjects")}
              </span>
              <ChevronRight size={16} className="shrink-0 self-end text-slate-500 transition-colors group-hover:text-slate-300" />
            </Link>
          </div>
        )}

        {topSections.map(renderSection)}
      </div>

      <div className="px-2 pb-4 md:px-4">
        <div>
          <Link to="/app-settings" className={utilityLinkClass}>
            <Settings2 size={16} className={utilityIconClass} />
            <span className="hidden md:inline">{t("navigation.appSettings")}</span>
          </Link>
        </div>
        {bottomSections.map(renderSection)}
      </div>
    </div>
  );
}
