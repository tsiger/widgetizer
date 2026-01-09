import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";
import { navigationSections } from "../../config/navigation";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { activeProject } = useProjectStore();
  const hasActiveProject = !!activeProject;

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
    const Icon = item.icon;
    const disabled = item.requiresProject && !hasActiveProject;

    return (
      <li key={item.id}>
        <NavLink to={item.path} className={linkClass(item.path, disabled)} disabled={disabled}>
          <div className={iconClass(item.path, disabled)}>
            <Icon size={20} />
          </div>
          <span className="hidden md:inline ml-1 text-sm">{t(item.labelKey)}</span>
        </NavLink>
      </li>
    );
  };

  const renderSection = (section) => {
    if (section.position === "bottom") {
      return (
        <div key={section.id} className="pb-2 px-2 md:pl-4">
          <h3 className="text-slate-600 text-xs font-bold mb-2 ml-2 hidden md:block md:border-t md:border-slate-800 pt-4">
            {t(section.titleKey)}
          </h3>
          <ul className="border-t border-slate-800 pt-4 md:pt-0 md:border-0">{section.items.map(renderNavItem)}</ul>
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
          <img src="/widgetizer_logo.svg" alt={t("common.appTitle")} className="hidden md:block w-40" />
          <img src="/widgetizer_symbol.svg" alt={t("common.appTitle")} className="md:hidden w-12 h-12 mx-auto" />
        </div>

        {topSections.map(renderSection)}
      </div>

      {bottomSections.map(renderSection)}
    </div>
  );
}
