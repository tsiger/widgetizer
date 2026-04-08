import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

const VARIANTS = {
  success: "bg-green-700 border-green-800 text-green-50",
  error: "bg-red-50 border-red-200 text-red-600",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  info: "bg-blue-50 border-blue-200 text-blue-600",
};

export default function Toast({
  message,
  variant = "info",
  onDismiss,
  phase = "visible",
}) {
  const { t } = useTranslation();

  if (!message) return null;

  const animationClasses = {
    entering: "translate-x-6 scale-[0.98] opacity-0",
    visible: "translate-x-0 scale-100 opacity-100",
    exiting: "translate-x-6 scale-[0.98] opacity-0 pointer-events-none",
  };

  return (
    <div
      className={`
				w-full p-4 border rounded-sm flex justify-between items-start shadow-lg
				${VARIANTS[variant] || VARIANTS.info}
				transform-gpu will-change-transform
				transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
				motion-reduce:transform-none motion-reduce:transition-none
				${animationClasses[phase] || animationClasses.visible}
			`}
    >
      <div>{message}</div>
      {onDismiss && (
        <button
          className={`ml-4 ${variant === "success" ? "text-green-200 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}
          onClick={onDismiss}
          aria-label={t("common.aria.dismiss")}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
