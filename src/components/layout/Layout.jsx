import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { Outlet, useLocation } from "react-router-dom";
import useNavigationGuard from "../../hooks/useNavigationGuard";

export default function Layout() {
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";
  
  // Activate navigation guard (useBlocker) when on page editor route
  useNavigationGuard();

  return (
    <div className="flex h-screen overflow-hidden">
      {!isPageEditor && <Sidebar />}

      <div className={`flex-1 flex flex-col relative z-30 ${!isPageEditor ? "ml-[72px] md:ml-48" : ""}`}>
        <div className={`flex-1 ${isPageEditor ? "overflow-hidden" : "overflow-y-auto p-14"} bg-slate-100`}>
          <Outlet />
        </div>

        {!isPageEditor && <Footer />}
      </div>
    </div>
  );
}
