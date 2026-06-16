import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Copy, ClipboardPaste, CopyPlus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const MENU_WIDTH = 216;
const MENU_HEIGHT_ESTIMATE = 170; // 4 items + divider; used only for edge flipping

/**
 * Lightweight right-click / kebab context menu for a sidebar widget.
 * Positioned at viewport coordinates (`anchor`), with an invisible overlay that
 * catches outside clicks — mirrors the dropdown pattern in WidgetSelector.jsx.
 */
export default function WidgetContextMenu({
  isOpen,
  onClose,
  anchor,
  canPaste = false,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
}) {
  const { t } = useTranslation();
  const menuRef = useRef(null);
  const [style, setStyle] = useState({ position: "fixed", top: 0, left: 0, zIndex: 9999 });

  // Clamp/flip the menu so it stays inside the viewport.
  useLayoutEffect(() => {
    if (!isOpen || !anchor) return;

    let left = anchor.x;
    let top = anchor.y;

    if (left + MENU_WIDTH > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
    }
    if (top + MENU_HEIGHT_ESTIMATE > window.innerHeight - 8) {
      top = Math.max(8, anchor.y - MENU_HEIGHT_ESTIMATE);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyle({ position: "fixed", top, left, zIndex: 9999 });
  }, [isOpen, anchor]);

  // Close on Escape, and on scroll/resize (the anchor would otherwise go stale).
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const run = (fn) => () => {
    if (fn) fn();
    onClose();
  };

  const itemClass =
    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors";

  return (
    <>
      {/* Invisible overlay to catch outside clicks / right-clicks */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      <div
        ref={menuRef}
        className="bg-white border border-slate-200 rounded-md shadow-lg py-1"
        style={{ ...style, width: MENU_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={itemClass} onClick={run(onCopy)}>
          <Copy size={14} className="text-slate-400" />
          <span>{t("pageEditor.actions.copyWidget")}</span>
        </button>

        <button
          type="button"
          className={
            canPaste
              ? itemClass
              : "w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm text-slate-300 cursor-not-allowed"
          }
          disabled={!canPaste}
          onClick={canPaste ? run(onPaste) : undefined}
        >
          <ClipboardPaste size={14} className={canPaste ? "text-slate-400" : "text-slate-300"} />
          <span>{t("pageEditor.actions.pasteWidgetAfter")}</span>
        </button>

        <button type="button" className={itemClass} onClick={run(onDuplicate)}>
          <CopyPlus size={14} className="text-slate-400" />
          <span>{t("pageEditor.actions.duplicateWidget")}</span>
        </button>

        <div className="my-1 border-t border-slate-100" />

        <button
          type="button"
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
          onClick={run(onDelete)}
        >
          <Trash2 size={14} />
          <span>{t("pageEditor.actions.deleteWidget")}</span>
        </button>
      </div>
    </>
  );
}
