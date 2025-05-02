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

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
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
