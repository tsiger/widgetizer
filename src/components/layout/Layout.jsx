import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import Footer from "./Footer";
import Content from "./Content";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col ml-[72px] md:ml-48 relative z-30">
        <Content>
          <Outlet />
        </Content>

        {!isPageEditor && <Footer />}
      </div>
    </div>
  );
}
