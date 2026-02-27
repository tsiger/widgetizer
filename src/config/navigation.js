import { Home, Folder, File, Menu, Image, Settings, Rocket, SlidersHorizontal, Layers, Puzzle } from "lucide-react";

export const navigationSections = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        labelKey: "navigation.dashboard",
        path: "/",
        icon: Home,
        hiddenForSource: ["ai", "theme"],
      },
      {
        id: "projects",
        labelKey: "navigation.projects",
        path: "/projects",
        icon: Folder,
        hiddenForSource: ["ai", "theme"],
      },
    ],
  },
  {
    id: "site",
    titleKey: "navigation.site",
    items: [
      {
        id: "pages",
        labelKey: "navigation.pages",
        path: "/pages",
        icon: File,
        requiresProject: true,
      },
      {
        id: "menus",
        labelKey: "navigation.menus",
        path: "/menus",
        icon: Menu,
        requiresProject: true,
        hiddenForSource: ["ai"],
      },
      {
        id: "media",
        labelKey: "navigation.media",
        path: "/media",
        icon: Image,
        requiresProject: true,
        hiddenForSource: ["ai"],
      },
      {
        id: "settings",
        labelKey: "navigation.settings",
        path: "/settings",
        icon: Settings,
        requiresProject: true,
        labelOverrides: { theme: "navigation.design", ai: "navigation.design" },
      },
    ],
  },
  {
    id: "appearance",
    titleKey: "navigation.appearance",
    items: [
      {
        id: "themes",
        labelKey: "navigation.themes",
        path: "/themes",
        icon: Layers,
        requiresProject: true,
        hiddenForSource: ["ai", "theme"],
      },
    ],
  },
  {
    id: "extend",
    titleKey: "navigation.extend",
    items: [
      {
        id: "plugins",
        labelKey: "navigation.plugins",
        path: "/plugins",
        icon: Puzzle,
        requiresProject: true,
        hiddenForSource: ["ai", "theme"],
      },
    ],
  },
  {
    id: "tools",
    titleKey: "navigation.tools",
    items: [
      {
        id: "export",
        labelKey: "navigation.exportSite",
        path: "/export-site",
        icon: Rocket,
        requiresProject: true,
        labelOverrides: { theme: "navigation.publish", ai: "navigation.publish" },
      },
    ],
  },
  {
    id: "general",
    titleKey: "navigation.general",
    position: "bottom",
    items: [
      {
        id: "app-settings",
        labelKey: "navigation.appSettings",
        path: "/app-settings",
        icon: SlidersHorizontal,
        requiresProject: true,
        hiddenForSource: ["ai", "theme"],
      },
    ],
  },
];

/**
 * Check if a given pathname is restricted for a project source type.
 * Returns true if the path matches a nav item that is hidden for the given source.
 */
export function isPathRestrictedForSource(pathname, source) {
  if (!source || source === "manual") return false;
  for (const section of navigationSections) {
    for (const item of section.items) {
      if (item.hiddenForSource?.includes(source) && pathname.startsWith(item.path) && item.path !== "/") {
        return true;
      }
    }
  }
  // Special case: dashboard (path="/") is only restricted if exact match
  if (pathname === "/") {
    const dashboard = navigationSections[0]?.items[0];
    if (dashboard?.hiddenForSource?.includes(source)) return true;
  }
  return false;
}

/**
 * Get the default redirect path for a given source type.
 */
export function getDefaultPathForSource() {
  return "/pages";
}
