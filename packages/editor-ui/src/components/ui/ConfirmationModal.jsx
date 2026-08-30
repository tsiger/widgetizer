import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

// Open dialogs, oldest first. Only the newest (last) may act on keys: with two
// dialogs up — a page-local confirmation under the navigation guard's prompt —
// the older instance's capture listener runs first and would otherwise answer
// an Escape meant for the dialog the user actually sees, while its
// stopImmediatePropagation starved the visible one. Open order matches visual
// order here: with a backdrop covering the page, a second dialog can only
// appear through non-pointer means (navigation blocking), and that one is
// provider-mounted, rendering later in the DOM.
const openDialogs = [];

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger", // or "warning", "info"
  // Where focus goes when the dialog closes: an element or a ref to one. Defaults
  // to whatever was focused when the dialog opened, which is wrong when the
  // opener unmounts in the same click — a row menu's "Delete" item closes its
  // menu and opens this dialog in one batched update, so by the time the open
  // effect looks, nothing is focused. Those callers pass the menu's trigger.
  returnFocusTo = null,
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  // Read at close time, not captured at open: the caller decides the target
  // when it opens the dialog, and the ref may only be populated later.
  const returnFocusToRef = useRef(returnFocusTo);
  useEffect(() => {
    returnFocusToRef.current = returnFocusTo;
  });
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
      const explicit = returnFocusToRef.current;
      const target = (explicit && "current" in explicit ? explicit.current : explicit) || previouslyFocused;
      // A target that left the DOM (its row was deleted, the page navigated) or
      // was never anything (body) is skipped rather than focused to no effect.
      if (target instanceof HTMLElement && target.isConnected && target !== document.body) target.focus();
    };
  }, [isOpen]);

  // While open, the dialog owns the keyboard, the way the native confirm() it
  // replaced did. The listener runs in the capture phase on `document` and
  // swallows every key — propagation AND default — except an explicit
  // allowlist: Escape (cancel), Tab (the trap below), Enter/Space (activate the
  // focused button). Why so strict: expanded rich-text/code editors, row menus
  // and media drawers listen for Escape on `document`; the page editor's
  // Delete/Backspace, undo/redo and Ctrl/Cmd+S listen on `window`; and an
  // unstopped Ctrl/Cmd+S would fall through to the browser's own save-page UI.
  // Nothing behind an open confirm may act, visibly or invisibly. Keys the
  // browser reserves for itself (Ctrl/Cmd+W/T/N) cannot be blocked by any page;
  // tab-close is still caught by the guards' beforeunload layer. If this dialog
  // ever gains a text input, the allowlist must widen to typing keys.
  //
  // One rung of the event ladder is out of reach: a WINDOW-capture keydown
  // listener fires before this handler and cannot be silenced from here. Don't
  // register one anywhere in an app that shows this dialog — a repo test
  // (noCaptureKeydown) trips if one appears.
  useEffect(() => {
    if (!isOpen) return;

    const token = {};
    openDialogs.push(token);

    const handleKeyDown = (e) => {
      // Not the topmost dialog: leave the key for the one that is.
      if (openDialogs[openDialogs.length - 1] !== token) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
        return;
      }
      // Allowlisted keys keep their DEFAULT action (button activation, Tab
      // movement) — but still must not reach listeners behind the dialog.
      if (e.key === "Enter" || e.key === " ") {
        e.stopImmediatePropagation();
        return;
      }
      if (e.key !== "Tab") {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      e.stopImmediatePropagation();

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

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      const i = openDialogs.indexOf(token);
      if (i !== -1) openDialogs.splice(i, 1);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
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
    // z-[1100]: deliberately above every app overlay — the expanded rich-text /
    // code editors (z-1000) and any z-50 modal (e.g. an embedding shell's own
    // dialogs) — because this dialog can open *while* those are up (browser
    // Back on a dirty page) and it holds the keyboard, so it must be the thing
    // the user sees. The native confirm() it replaced always sat on top.
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1100] p-4"
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
