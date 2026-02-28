import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";
import useThemeUpdateStore from "../../stores/themeUpdateStore";
import useAppInfoStore from "../../stores/appInfoStore";
import { navigationSections } from "../../config/navigation";
import { joinDashboardUrl } from "../../lib/hostedUrls";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { activeProject } = useProjectStore();
  const hasActiveProject = !!activeProject;
  const { updateCount: themeUpdateCount, fetchUpdateCount } = useThemeUpdateStore();
  const hostedMode = useAppInfoStore((state) => state.hostedMode);
  const loaded = useAppInfoStore((state) => state.loaded);
  const dashboardUrl = useAppInfoStore((state) => state.dashboardUrl);
  const assetBase = import.meta.env.BASE_URL || "/";

  // Fetch theme update count on mount
  useEffect(() => {
    fetchUpdateCount();
  }, [fetchUpdateCount]);

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const linkClass = (path, disabled = false) =>
    `flex items-center justify-center md:justify-start p-2 rounded-sm transition-all duration-150 ${
      disabled ? "opacity-40 cursor-not-allowed" : isActive(path) ? "bg-pink-600 border-pink-600" : "hover:bg-slate-800"
    } border border-slate-700 md:border-none`;

  const iconClass = (path, disabled = false) =>
    `w-8 h-8 md:w-4 md:h-4 flex items-center justify-center ${
      disabled ? "text-slate-500" : isActive(path) ? "text-white" : "text-pink-600"
    }`;

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
    const source = activeProject?.source;
    if (source && item.hiddenForSource?.includes(source)) return null;

    const Icon = item.icon;
    const disabled = item.requiresProject && !hasActiveProject;
    const showBadge = item.id === "themes" && themeUpdateCount > 0;
    const labelKey = (source && item.labelOverrides?.[source]) || item.labelKey;

    // External links (e.g. My Sites → dashboard) render as <a> instead of <Link>
    if (item.external) {
      let href = item.path;
      if (item.hostedOnly && dashboardUrl) {
        href = joinDashboardUrl(dashboardUrl, item.path);
      }
      return (
        <li key={item.id}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center md:justify-start p-2 rounded-sm transition-all duration-150 hover:bg-slate-800 border border-slate-700 md:border-none"
          >
            <div className="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-pink-600">
              <Icon size={20} />
            </div>
            <span className="hidden md:inline ml-1 text-sm">{t(labelKey)}</span>
          </a>
        </li>
      );
    }

    return (
      <li key={item.id}>
        <NavLink to={item.path} className={linkClass(item.path, disabled)} disabled={disabled}>
          <div className={iconClass(item.path, disabled)}>
            <Icon size={20} />
          </div>
          <span className="hidden md:inline ml-1 text-sm">{t(labelKey)}</span>
          {showBadge && (
            <span className="ml-auto bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {themeUpdateCount}
            </span>
          )}
        </NavLink>
      </li>
    );
  };

  const renderSection = (section) => {
    if (section.hostedOnly && !hostedMode) return null;
    if (section.hiddenInHosted && hostedMode) return null;
    const source = activeProject?.source;
    const visibleItems = section.items.filter((item) => {
      if (item.hostedOnly && !hostedMode) return false;
      if (item.hiddenInHosted && hostedMode) return false;
      if (source && item.hiddenForSource?.includes(source)) return false;
      return true;
    });
    if (visibleItems.length === 0) return null;

    if (section.position === "bottom") {
      return (
        <div key={section.id} className="pt-4 border-t border-slate-800">
          <h3 className="text-slate-600 text-xs font-bold mb-2 ml-2 hidden md:block">{t(section.titleKey)}</h3>
          <ul className="space-y-2 md:space-y-1">{section.items.map(renderNavItem)}</ul>
        </div>
      );
    }

    return (
      <div key={section.id} className="border-b border-slate-800 pb-4 mb-4">
        {section.titleKey && (
          <h3 className="text-slate-600 text-xs font-bold mb-2 ml-2 hidden md:block">{t(section.titleKey)}</h3>
        )}
        <ul className="space-y-2 md:space-y-1">{section.items.map(renderNavItem)}</ul>
      </div>
    );
  };

  const topSections = navigationSections.filter((s) => s.position !== "bottom");
  const bottomSections = navigationSections.filter((s) => s.position === "bottom");

  return (
    <div className="w-[72px] md:w-48 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="pb-2 px-2 md:px-4 grow">
        <div className="border-b border-slate-800 py-0 pb-2 mb-4 md:mb-4 md:py-4">
          <img src={`${assetBase}widgetizer_logo.svg`} alt={t("common.appTitle")} className="hidden md:block h-7" />
          <img src={`${assetBase}widgetizer_symbol.svg`} alt={t("common.appTitle")} className="md:hidden w-12 h-12 mx-auto" />
        </div>

        {loaded && topSections.map(renderSection)}
      </div>

      <div className="px-2 md:px-4 pb-2">
        {loaded && bottomSections.map(renderSection)}
      </div>
    </div>
  );
}
