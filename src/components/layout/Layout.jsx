import Sidebar from "./Sidebar";
import Footer from "./Footer";
import Content from "./Content";
import { Outlet, useLocation } from "react-router-dom";
import useNavigationGuard from "../../hooks/useNavigationGuard";

export default function Layout() {
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";
  const { guardedNavigate } = useNavigationGuard();

  return (
    <div className="flex h-screen overflow-hidden">
      {!isPageEditor && <Sidebar guardedNavigate={guardedNavigate} />}

      <div className={`flex-1 flex flex-col relative z-30 ${!isPageEditor ? "ml-[72px] md:ml-48" : ""}`}>
        <Content>
          <Outlet />
        </Content>

        {!isPageEditor && <Footer />}
      </div>
    </div>
  );
}
