import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger", // or "warning", "info"
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  // Move focus into the dialog on open and hand it back to the invoking element
  // on close. The restore step matters: this modal replaced window.confirm(),
  // which on Windows left Electron with nothing focused and inputs dead
  // (electron/electron#31917) — dropping focus here would recreate that.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  // Escape cancels; Tab cycles within the dialog so focus can't wander behind it.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll("button");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use translations for defaults
  const modalTitle = title || t("common.confirmAction");
  const modalMessage = message || t("common.confirmProceed");
  const modalConfirmText = confirmText || t("common.confirm");
  const modalCancelText = cancelText || t("common.cancel");

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="bg-white rounded-lg shadow-lg max-w-md w-full overflow-hidden"
        onClick={handleModalClick}
      >
        <div className={`p-4 ${variant === "danger" ? "bg-red-50" : "bg-yellow-50"} flex items-start gap-3`}>
          <AlertTriangle className={`${variant === "danger" ? "text-red-500" : "text-yellow-500"}`} />
          <h3 id={titleId} className="text-lg font-semibold">
            {modalTitle}
          </h3>
        </div>

        <div className="p-4">
          <div id={messageId} className="text-slate-600 whitespace-pre-line">
            {modalMessage}
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-sm hover:bg-slate-100"
          >
            {modalCancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-white rounded-sm ${
              variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-pink-600 hover:bg-pink-700"
            }`}
          >
            {modalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
