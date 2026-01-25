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
  const topClass = isPageEditor ? "top-16" : "top-4";

  return (
    <div className={`fixed ${topClass} right-4 z-50 space-y-2`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}
