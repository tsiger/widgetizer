import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";
import { navigationSections } from "../../config/navigation";
import { getAllPages } from "../../queries/pageManager";
import SidebarMeta from "./SidebarMeta";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const activeProject = useProjectStore((state) => state.activeProject);
  const hasActiveProject = !!activeProject;
  const [hasPages, setHasPages] = useState(false);

  const checkPages = useCallback(async () => {
    if (!hasActiveProject) {
      setHasPages(false);
      return;
    }
    try {
      const pages = await getAllPages();
      setHasPages(pages.length > 0);
    } catch {
      setHasPages(false);
    }
  }, [hasActiveProject]);

  useEffect(() => {
    checkPages();
  }, [checkPages, activeProject?.id, location.pathname]);

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

  const openSitePreview = async () => {
    try {
      const pages = await getAllPages();
      const homepage = pages.find((p) => p.slug === "index") || pages[0];
      if (!homepage) return;

      const electronOpenPreview = window.electronUpdater?.openPreviewWindow;
      if (typeof electronOpenPreview === "function") {
        electronOpenPreview(homepage.id);
        return;
      }

      const previewUrl = new URL(`/preview/${homepage.id}`, window.location.origin).toString();
      const previewWindow = window.open(previewUrl, "widgetizer-preview");
      previewWindow?.focus();
    } catch (error) {
      console.error("Failed to open site preview:", error);
    }
  };

  const handleAction = (actionId) => {
    if (actionId === "openSitePreview") {
      openSitePreview();
    }
  };

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
    const disabled = (item.requiresProject && !hasActiveProject) || (item.action === "openSitePreview" && !hasPages);

    // Action items (no path, trigger a function instead)
    if (item.action) {
      const actionClass = `w-full group flex items-center justify-center rounded-sm border p-2 transition-all duration-150 md:justify-start ${
        disabled
          ? "cursor-not-allowed opacity-40 border-transparent"
          : "border-slate-700 hover:bg-slate-800 md:border-none text-slate-400 hover:text-white cursor-pointer"
      }`;

      return (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => !disabled && handleAction(item.action)}
            className={actionClass}
            disabled={disabled}
          >
            <div className={iconClass("__none__", disabled)}>
              <Icon size={20} />
            </div>
            <span className={navLabelClass("__none__", disabled)}>{t(item.labelKey)}</span>
          </button>
        </li>
      );
    }

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
          <h3 className="ml-2 mb-2 hidden text-xs font-bold uppercase text-slate-500 md:block">{t(section.titleKey)}</h3>
          <ul className="space-y-2 md:space-y-1">{section.items.map(renderNavItem)}</ul>
        </div>
      );
    }

    return (
      <div key={section.id} className="mb-4 border-b border-slate-800 pb-4">
        {section.titleKey && <h3 className="ml-2 mb-2 hidden text-xs font-bold uppercase text-slate-500 md:block">{t(section.titleKey)}</h3>}
        <ul className="space-y-2 md:space-y-1">{section.items.map(renderNavItem)}</ul>
      </div>
    );
  };

  const topSections = navigationSections.filter((section) => section.position !== "bottom");
  const bottomSections = navigationSections.filter((section) => section.position === "bottom");

  return (
    <div className="fixed left-0 top-0 flex h-screen w-[72px] flex-col overflow-y-auto bg-slate-900 text-white md:w-[var(--sidebar-width)]">
      <div className="grow px-2 pb-2 md:px-[var(--shell-inset)]">
        <div className="mb-4 py-0 pb-2 md:pb-4 md:pt-[var(--shell-inset)]">
          <div className="hidden pt-1 md:block">
            <img src="/widgetizer_logo.svg" alt={t("common.appTitle")} className="h-auto w-[var(--sidebar-logo-width)]" />
          </div>
          <img src="/widgetizer_symbol.svg" alt={t("common.appTitle")} className="mx-auto h-12 w-12 md:hidden" />
        </div>

        {topSections.map(renderSection)}
      </div>

      <div className="px-2 pb-4 md:px-[var(--shell-inset)]">
        {bottomSections.map(renderSection)}
        <SidebarMeta />
      </div>
    </div>
  );
}
