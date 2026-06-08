import { Monitor, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Desktop/mobile preview switcher — the shared chrome used by the page editor top
 * bar, the standalone site preview, and the collection item preview. A `bg-slate-200`
 * pill with `Monitor`/`Smartphone`; the active mode is `bg-white text-pink-600`.
 *
 * @param {Object} props
 * @param {"desktop"|"mobile"} props.mode - Current preview mode.
 * @param {(mode: "desktop"|"mobile") => void} props.onChange - Called with the chosen mode.
 */
export default function PreviewModeToggle({ mode, onChange }) {
  const { t } = useTranslation();
  const isMobile = mode === "mobile";

  return (
    <div className="flex h-9 items-center gap-1 rounded-md bg-slate-200 p-1">
      <button
        type="button"
        onClick={() => onChange("desktop")}
        title={t("pageEditor.toolbar.desktopView")}
        className={`rounded p-1.5 ${
          !isMobile ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Monitor size={18} />
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        title={t("pageEditor.toolbar.mobileView")}
        className={`rounded p-1.5 ${
          isMobile ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Smartphone size={18} />
      </button>
    </div>
  );
}
