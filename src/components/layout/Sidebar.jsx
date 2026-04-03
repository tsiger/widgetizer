import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderOpen, Settings2 } from "lucide-react";
import useProjectStore from "../../stores/projectStore";
import useThemeUpdateStore from "../../stores/themeUpdateStore";
import { navigationSections } from "../../config/navigation";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { activeProject } = useProjectStore();
  const hasActiveProject = !!activeProject;
  const { updateCount: themeUpdateCount, fetchUpdateCount } = useThemeUpdateStore();

  useEffect(() => {
    fetchUpdateCount();
  }, [fetchUpdateCount]);

  const projectPickerHref = `/projects?next=${encodeURIComponent(location.pathname)}`;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const linkClass = (path, disabled = false) =>
    `flex items-center justify-center md:justify-start p-2 rounded-sm transition-all duration-150 ${
      disabled ? "opacity-40 cursor-not-allowed" : isActive(path) ? "bg-pink-600 border-pink-600" : "hover:bg-slate-800"
    } border border-slate-700 md:border-none`;

  const iconClass = (path, disabled = false) =>
    `w-8 h-8 md:w-4 md:h-4 flex items-center justify-center ${
      disabled ? "text-slate-500" : isActive(path) ? "text-white" : "text-pink-600"
    }`;

  const utilityLinkClass =
    "flex items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white md:justify-start";

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
    const showBadge = item.id === "themes" && themeUpdateCount > 0;

    return (
      <li key={item.id}>
        <NavLink to={item.path} className={linkClass(item.path, disabled)} disabled={disabled}>
          <div className={iconClass(item.path, disabled)}>
            <Icon size={20} />
          </div>
          <span className="ml-1 hidden text-sm md:inline">{t(item.labelKey)}</span>
          {showBadge && (
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
              {themeUpdateCount}
            </span>
          )}
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
          <img src="/widgetizer_logo.svg" alt={t("common.appTitle")} className="hidden h-7 md:block" />
          <img src="/widgetizer_symbol.svg" alt={t("common.appTitle")} className="mx-auto h-12 w-12 md:hidden" />
        </div>

        {activeProject && (
          <div className="mb-4 hidden rounded-lg border border-slate-800 bg-slate-950/50 p-3 md:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t("sidebar.currentProject")}</p>
            <Link to={projectPickerHref} className="mt-2 block rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-800">
              <span className="block truncate text-sm font-semibold text-white">{activeProject.name}</span>
              <span className="mt-1 block text-xs text-slate-400">{t("sidebar.switchProject")}</span>
            </Link>
          </div>
        )}

        {topSections.map(renderSection)}
      </div>

      <div className="px-2 pb-4 md:px-4">
        <div className="mb-4 space-y-2">
          <Link to={projectPickerHref} className={utilityLinkClass}>
            <FolderOpen size={16} />
            <span className="hidden md:inline">{t("sidebar.switchProject")}</span>
          </Link>
          <Link to="/app-settings" className={utilityLinkClass}>
            <Settings2 size={16} />
            <span className="hidden md:inline">{t("navigation.appSettings")}</span>
          </Link>
        </div>
        {bottomSections.map(renderSection)}
      </div>
    </div>
  );
}
