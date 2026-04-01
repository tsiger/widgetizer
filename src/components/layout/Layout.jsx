import Sidebar from "./Sidebar";
import Footer from "./Footer";
import UpdateBanner from "./UpdateBanner";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";

  return (
    <div className="flex h-screen overflow-hidden">
      {!isPageEditor && <Sidebar />}

      <div
        className={`relative z-30 flex flex-1 flex-col ${
          !isPageEditor ? "ml-[72px] md:ml-48 bg-slate-900 pr-0.5 pb-0.5 pt-0.5 md:pr-1 md:pb-1 md:pt-1" : ""
        }`}
      >
        <UpdateBanner />

        <div
          className={`flex flex-1 flex-col min-h-0 ${
            isPageEditor
              ? "overflow-hidden"
              : "overflow-hidden rounded-[18px] border-[10px] border-slate-900 bg-slate-900"
          }`}
        >
          <div
            className={`flex-1 min-h-0 ${
              isPageEditor ? "overflow-hidden" : "overflow-y-auto bg-slate-100 p-8 md:p-10"
            }`}
          >
            <Outlet />
          </div>

          {!isPageEditor && <Footer />}
        </div>
      </div>
    </div>
  );
}
