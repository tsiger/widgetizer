import { AlertTriangle } from "lucide-react";

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // or "warning", "info" TODO: Add more variants
}) {
  if (!isOpen) return null;

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full overflow-hidden" onClick={handleModalClick}>
        <div className={`p-4 ${variant === "danger" ? "bg-red-50" : "bg-yellow-50"} flex items-start gap-3`}>
          <AlertTriangle className={`${variant === "danger" ? "text-red-500" : "text-yellow-500"}`} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="p-4">
          <div className="text-slate-600 whitespace-pre-line">{message}</div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-sm hover:bg-slate-100">
            {cancelText}
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
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
