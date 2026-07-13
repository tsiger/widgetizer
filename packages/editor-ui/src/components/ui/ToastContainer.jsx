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
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex w-[min(26rem,calc(100vw-36px))] flex-col gap-2">
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
