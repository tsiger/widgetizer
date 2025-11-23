import { Home, Folder, File, Menu, Image, Settings, Rocket, SlidersHorizontal, Layers, Puzzle } from "lucide-react";

export const navigationSections = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        path: "/",
        icon: Home,
      },
      {
        id: "projects",
        label: "Projects",
        path: "/projects",
        icon: Folder,
      },
    ],
  },
  {
    id: "site",
    title: "Site",
    items: [
      {
        id: "pages",
        label: "Pages",
        path: "/pages",
        icon: File,
        requiresProject: true,
      },
      {
        id: "menus",
        label: "Menus",
        path: "/menus",
        icon: Menu,
        requiresProject: true,
      },
      {
        id: "media",
        label: "Media",
        path: "/media",
        icon: Image,
        requiresProject: true,
      },
      {
        id: "settings",
        label: "Settings",
        path: "/settings",
        icon: Settings,
        requiresProject: true,
      },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    items: [
      {
        id: "themes",
        label: "Themes",
        path: "/themes",
        icon: Layers,
        requiresProject: true,
      },
    ],
  },
  {
    id: "extend",
    title: "Extend",
    items: [
      {
        id: "plugins",
        label: "Plugins",
        path: "/plugins",
        icon: Puzzle,
        requiresProject: true,
      },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    items: [
      {
        id: "export",
        label: "Export site",
        path: "/export-site",
        icon: Rocket,
        requiresProject: true,
      },
    ],
  },
  {
    id: "general",
    title: "General",
    position: "bottom",
    items: [
      {
        id: "app-settings",
        label: "Settings",
        path: "/app-settings",
        icon: SlidersHorizontal,
        requiresProject: true,
      },
    ],
  },
];

