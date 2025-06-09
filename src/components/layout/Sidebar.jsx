import { Link, useLocation } from "react-router-dom";
import { Home, Folder, File, Menu, Image, Settings, Palette, Rocket, SlidersHorizontal } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const linkClass = (path) =>
    `flex items-center justify-center md:justify-start p-2 rounded-sm ${
      isActive(path) ? "bg-pink-600 border-pink-600" : "hover:bg-slate-800"
    } border border-slate-700 md:border-none`;

  const iconClass = (path) =>
    `w-8 h-8 md:w-4 md:h-4 flex items-center justify-center ${isActive(path) ? "text-white" : "text-pink-600"}`;

  return (
    <div className="w-[72px] md:w-48 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="pb-2 px-2 md:p-4 grow">
        <div className="border-b border-slate-800 py-0 pb-2 mb-4 md:mb-4 md:py-6">
          <img src="/widgetizer_logo.svg" alt="Widgetizer" className="hidden md:block w-40" />
          <img src="/widgetizer_symbol.svg" alt="Widgetizer" className="md:hidden w-12 h-12 mx-auto" />
        </div>
        <ul className="border-b border-slate-800 pb-4 mb-4 space-y-2 md:space-y-1">
          <li>
            <Link to="/" className={linkClass("/")}>
              <div className={iconClass("/")}>
                <Home size={20} />
              </div>
              <span className="hidden md:inline ml-1 text-sm">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link to="/projects" className={linkClass("/projects")}>
              <div className={iconClass("/projects")}>
                <Folder size={20} />
              </div>
              <span className="hidden md:inline ml-1 text-sm">Projects</span>
            </Link>
          </li>
        </ul>
        <div className="border-b border-slate-800 pb-4 mb-4">
          <h3 className="text-slate-500 mb-2 ml-2 hidden md:block">Site</h3>
          <ul className="space-y-2 md:space-y-1">
            <li>
              <Link to="/pages" className={linkClass("/pages")}>
                <div className={iconClass("/pages")}>
                  <File size={20} />
                </div>
                <span className="hidden md:inline ml-1 text-sm">Pages</span>
              </Link>
            </li>
            <li>
              <Link to="/menus" className={linkClass("/menus")}>
                <div className={iconClass("/menus")}>
                  <Menu size={20} />
                </div>
                <span className="hidden md:inline ml-1 text-sm">Menus</span>
              </Link>
            </li>
            <li>
              <Link to="/media" className={linkClass("/media")}>
                <div className={iconClass("/media")}>
                  <Image size={20} />
                </div>
                <span className="hidden md:inline ml-1 text-sm">Media</span>
              </Link>
            </li>
            <li>
              <Link to="/settings" className={linkClass("/settings")}>
                <div className={iconClass("/settings")}>
                  <Settings size={20} />
                </div>
                <span className="hidden md:inline ml-1 text-sm">Settings</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="border-b border-slate-800 pb-4 mb-4">
          <h3 className="text-slate-500 mb-2 ml-2 hidden md:block">Appearance</h3>
          <ul className="space-y-2 md:space-y-1">
            <li>
              <Link to="/starter-kits" className={linkClass("/starter-kits")}>
                <div className={iconClass("/starter-kits")}>
                  <Palette size={20} />
                </div>
                <span className="hidden md:inline ml-1 text-sm">Starter kits</span>
              </Link>
            </li>
          </ul>
        </div>
        <h3 className="text-slate-500 mb-2 ml-2 hidden md:block">Tools</h3>
        <ul className="space-y-2 md:space-y-1">
          <li>
            <Link to="/export-site" className={linkClass("/export-site")}>
              <div className={iconClass("/export-site")}>
                <Rocket size={20} />
              </div>
              <span className="hidden md:inline ml-1 text-sm">Export site</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="pb-2 px-2 md:pl-4">
        <h3 className="text-slate-500 mb-2 ml-2 hidden md:block md:border-t md:border-slate-800 pt-4">General</h3>
        <ul className="border-t border-slate-800 pt-4 md:pt-0 md:border-0">
          <li>
            <Link to="/app-settings" className={linkClass("/app-settings")}>
              <div className={iconClass("/app-settings")}>
                <SlidersHorizontal size={20} />
              </div>
              <span className="hidden md:inline ml-2 text-sm">Settings</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
