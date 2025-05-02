import { useLocation } from "react-router-dom";

export default function Content({ children }) {
  const location = useLocation();
  const isPageEditor = location.pathname === "/page-editor";

  return (
    <div
      className={`flex-1 ${isPageEditor ? "overflow-hidden" : "overflow-y-auto"} bg-slate-100 ${
        isPageEditor ? "" : "p-14"
      }`}
    >
      {children}
    </div>
  );
}
