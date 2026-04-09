import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, FolderOpen, Palette, Settings2 } from "lucide-react";
import useThemeUpdateStore from "../../stores/themeUpdateStore";

export default function AdminMenu({ activeProject }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const updateCount = useThemeUpdateStore((state) => state.updateCount);
  const fetchUpdateCount = useThemeUpdateStore((state) => state.fetchUpdateCount);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!activeProject?.id) return;
    fetchUpdateCount();
  }, [activeProject?.id, fetchUpdateCount]);

  useEffect(() => {
    if (!activeProject?.id || !isOpen) return;
    fetchUpdateCount();
  }, [activeProject?.id, isOpen, fetchUpdateCount]);

  const isProjectsActive = location.pathname.startsWith("/projects");
  const isThemesActive = location.pathname.startsWith("/themes");
  const isAppSettingsActive = location.pathname.startsWith("/app-settings");
  const isMenuActive = isProjectsActive || isThemesActive || isAppSettingsActive;
  const hasThemeUpdates = !!activeProject && updateCount > 0;
  const badgeLabel = updateCount > 99 ? "99+" : String(updateCount);

  const buttonClass = `inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
    isMenuActive || isOpen
      ? "border-slate-500 bg-slate-800 text-white"
      : "border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
  }`;

  const itemClass = (active, disabled = false) =>
    `flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
      disabled
        ? "cursor-not-allowed text-slate-400"
        : active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const badgeClass =
    "inline-flex min-w-5 items-center justify-center rounded-full bg-pink-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white";

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button type="button" className={buttonClass} onClick={() => setIsOpen((open) => !open)} aria-haspopup="menu" aria-expanded={isOpen}>
        <Settings2 size={16} />
        <span>{t("navigation.admin")}</span>
        {hasThemeUpdates && <span className={badgeClass}>{badgeLabel}</span>}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <Link to="/projects" className={itemClass(isProjectsActive)} onClick={() => setIsOpen(false)}>
            <FolderOpen size={16} />
            <span>{t("navigation.projects")}</span>
          </Link>

          {activeProject ? (
            <Link to="/themes" className={itemClass(isThemesActive)} onClick={() => setIsOpen(false)}>
              <Palette size={16} />
              <span>{t("navigation.themes")}</span>
              {hasThemeUpdates && <span className={`ml-auto ${badgeClass}`}>{badgeLabel}</span>}
            </Link>
          ) : (
            <div className={itemClass(false, true)} aria-disabled="true">
              <Palette size={16} />
              <span>{t("navigation.themes")}</span>
            </div>
          )}

          <Link to="/app-settings" className={itemClass(isAppSettingsActive)} onClick={() => setIsOpen(false)}>
            <Settings2 size={16} />
            <span>{t("navigation.appSettings")}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
