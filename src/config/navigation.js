import { Home, Folder, File, ListTree, Image, Settings, Rocket, SlidersHorizontal, Layers } from "lucide-react";

export const navigationSections = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        labelKey: "navigation.dashboard",
        path: "/",
        icon: Home,
      },
      {
        id: "projects",
        labelKey: "navigation.projects",
        path: "/projects",
        icon: Folder,
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
        icon: ListTree,
        requiresProject: true,
      },
      {
        id: "media",
        labelKey: "navigation.media",
        path: "/media",
        icon: Image,
        requiresProject: true,
      },
      {
        id: "settings",
        labelKey: "navigation.settings",
        path: "/settings",
        icon: Settings,
        requiresProject: true,
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
      },
    ],
  },
];
