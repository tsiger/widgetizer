import { useEffect } from "react";
import useToastStore from "../../stores/toastStore";
import Toast from "./Toast";

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const clearToasts = useToastStore((state) => state.clearToasts);

  useEffect(() => {
    return () => {
      clearToasts();
    };
  }, [clearToasts]);

  // Check if we are in the page editor to adjust position
  const isPageEditor = typeof window !== "undefined" && window.location.pathname.includes("/page-editor");
  const containerPositionClass = isPageEditor ? "top-4 right-4" : "top-[18px] right-[18px]";

  return (
    <div className={`fixed ${containerPositionClass} z-50 flex w-[min(26rem,calc(100vw-36px))] flex-col gap-2`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          phase={toast.phase}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}
