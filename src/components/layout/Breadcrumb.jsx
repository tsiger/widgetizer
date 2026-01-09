import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";
import usePageStore from "../../stores/pageStore";
import { useMemo } from "react";

export default function Breadcrumb() {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const activeProject = useProjectStore((state) => state.activeProject);
  const pages = usePageStore((state) => state.pages);

  // Build breadcrumb array based on current route
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const crumbs = [];

    // Dashboard
    if (path === "/") {
      crumbs.push({ label: t("navigation.dashboard"), to: "/" });
      return crumbs;
    }

    // Projects routes
    if (path.startsWith("/projects")) {
      crumbs.push({ label: t("navigation.projects"), to: "/projects" });

      if (path === "/projects/add") {
        crumbs.push({ label: t("projectsAdd.title") });
      } else if (path.startsWith("/projects/edit/")) {
        const projectName = activeProject?.name || params.id;
        crumbs.push({ label: `${t("breadcrumb.edit")}: ${projectName}` });
      }
      return crumbs;
    }

    // App Settings (non-project route)
    if (path === "/app-settings") {
      crumbs.push({ label: t("navigation.general"), to: "/" });
      crumbs.push({ label: t("navigation.appSettings") });
      return crumbs;
    }

    // Project-scoped routes
    if (activeProject) {
      crumbs.push({ label: activeProject.name, to: "/projects" });

      // Pages routes
      if (path.startsWith("/pages")) {
        crumbs.push({ label: t("navigation.pages"), to: "/pages" });

        if (path === "/pages/add") {
          crumbs.push({ label: t("pagesAdd.title") });
        } else if (path.includes("/edit")) {
          const pageId = params.id;
          const page = pages?.[pageId];
          const pageName = page?.title || pageId;
          crumbs.push({ label: `${t("breadcrumb.edit")}: ${pageName}` });
        }
      }

      // Menus routes
      else if (path.startsWith("/menus")) {
        crumbs.push({ label: t("navigation.menus"), to: "/menus" });

        if (path === "/menus/add") {
          crumbs.push({ label: t("menusAdd.title") });
        } else if (path.includes("/edit")) {
          const menuId = params.id;
          // TODO: Fetch menu name from store if needed
          crumbs.push({ label: `${t("breadcrumb.edit")}: ${menuId}` });
        } else if (path.includes("/structure")) {
          const menuId = params.id;
          // TODO: Fetch menu name from store if needed
          crumbs.push({ label: menuId });
          crumbs.push({ label: t("breadcrumb.structure") });
        }
      }

      // Media
      else if (path === "/media") {
        crumbs.push({ label: t("navigation.media") });
      }

      // Settings
      else if (path === "/settings") {
        crumbs.push({ label: t("navigation.settings") });
      }

      // Themes
      else if (path === "/themes") {
        crumbs.push({ label: t("navigation.themes") });
      }

      // Plugins
      else if (path === "/plugins") {
        crumbs.push({ label: t("navigation.plugins") });
      }

      // Export Site
      else if (path === "/export-site") {
        crumbs.push({ label: t("navigation.exportSite") });
      }
    }

    return crumbs;
  }, [location.pathname, params, activeProject, pages, t]);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-xs" aria-label={t("breadcrumb.label")}>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-slate-400">→</span>}
            {isLast || !crumb.to ? (
              <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={crumb.label}>
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.to} className="text-pink-600 hover:underline truncate max-w-[200px]" title={crumb.label}>
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
