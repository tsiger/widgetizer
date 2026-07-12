import { useRef, useState, useEffect, useCallback, useId } from "react";
import { ChevronDown } from "lucide-react";

// Reusable split button: a primary action + an optional dropdown of secondary
// actions. Presentational only — the caller resolves labels/handlers/enabled state.
// Implements the WAI-ARIA menu-button pattern (roles, roving tabindex, keyboard
// nav, focus in-on-open / return-on-close). Open/close/outside/Escape are
// encapsulated here (no document listeners leak to callers).

const ITEM_CLASS = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors";
const PRIMARY_BASE = "flex items-center justify-center gap-2 px-3 h-9 min-w-24 text-sm";

function primaryClass(disabled, hasMenu) {
  const shape = hasMenu ? "rounded-l-sm" : "rounded-sm";
  const tone = disabled ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-pink-600 hover:bg-pink-700 text-white";
  return `${PRIMARY_BASE} ${shape} ${tone}`;
}

// The caret stays clickable even when every item is disabled (so the menu can
// still be opened to see what's there), but reads visually as disabled —
// matching primaryClass's disabled tone rather than the active pink.
//
// primaryClass's tone and this one are deliberately independent signals —
// the primary reflects whether ITS OWN action is available, the caret
// reflects whether the DROPDOWN has anything useful — so a disabled-grey
// primary next to an active-pink caret is an intentional, meaningful state
// (e.g. hosted's "Save" is grey with nothing new to save, but "Save &
// Publish" stays available after a rollback re-flags needs_publish), not a
// rendering glitch. The reverse — an enabled primary next to a fully-grey
// caret — would read as broken (a live primary action with a dropdown that
// has literally nothing to offer), so any caller wiring a menu's
// enabledWhen signals should keep them a superset of the primary's own
// (verified true today for hosted's only config: publishPending's OR
// includes hasUnsavedChanges directly, so the caret is never fully disabled
// while primary is enabled). SplitButton itself is presentational and
// doesn't enforce this — it's a caller responsibility.
function caretClass(allItemsDisabled) {
  const tone = allItemsDisabled
    ? "border-slate-300 bg-slate-200 hover:bg-slate-300 text-slate-500"
    : "border-pink-700 bg-pink-600 hover:bg-pink-700 text-white";
  return `flex items-center justify-center px-2 h-9 rounded-r-sm border-l ${tone}`;
}

export default function SplitButton({ primary, items = [], menuLabel = "More actions" }) {
  const hasMenu = items.length > 0;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const caretRef = useRef(null);
  const itemRefs = useRef([]);
  const menuRef = useRef(null);
  const menuId = useId();

  const enabledIndexes = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
  const allItemsDisabled = items.length > 0 && enabledIndexes.length === 0;

  const close = useCallback((focusCaret = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (focusCaret) caretRef.current?.focus();
  }, []);

  const openMenu = (toFirst = true) => {
    if (!hasMenu) return;
    setOpen(true);
    setActiveIndex(toFirst ? (enabledIndexes[0] ?? -1) : (enabledIndexes[enabledIndexes.length - 1] ?? -1));
  };

  const moveActive = (dir) => {
    if (!enabledIndexes.length) return;
    const pos = enabledIndexes.indexOf(activeIndex);
    const next =
      pos === -1
        ? dir > 0
          ? enabledIndexes[0]
          : enabledIndexes[enabledIndexes.length - 1]
        : enabledIndexes[(pos + dir + enabledIndexes.length) % enabledIndexes.length];
    setActiveIndex(next);
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  // Move DOM focus to the active item; if the menu opened with no enabled
  // item (all disabled), focus the menu container itself so Escape/Tab
  // keyboard handling stays reachable.
  useEffect(() => {
    if (!open) return;
    if (activeIndex >= 0) itemRefs.current[activeIndex]?.focus();
    else menuRef.current?.focus();
  }, [open, activeIndex]);

  const onCaretKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(false);
    }
  };

  const onMenuKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(enabledIndexes[0] ?? -1);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        const it = items[activeIndex];
        if (it && !it.disabled) {
          it.onClick?.();
          close(true);
        }
        break;
      }
      default:
        break;
    }
  };

  const PrimaryIcon = primary.icon;
  const primaryButton = (
    <button
      type="button"
      onClick={() => {
        primary.onClick?.();
        // The primary button lives inside rootRef alongside the caret/menu,
        // so the outside-click handler's containment check never fires for
        // it — close explicitly, or the dropdown stays visibly open after a
        // primary click while it was expanded.
        if (open) close(false);
      }}
      disabled={primary.disabled}
      title={primary.title || undefined}
      aria-busy={primary.busy || undefined}
      className={primaryClass(primary.disabled, hasMenu)}
    >
      {PrimaryIcon ? <PrimaryIcon size={18} /> : null}
      {primary.label}
    </button>
  );

  if (!hasMenu) return primaryButton;

  return (
    <div ref={rootRef} className="relative inline-flex">
      {primaryButton}
      <button
        ref={caretRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={menuLabel}
        onClick={() => (open ? close(false) : openMenu(true))}
        onKeyDown={onCaretKeyDown}
        className={caretClass(allItemsDisabled)}
      >
        <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((it, i) => {
            const ItemIcon = it.icon;
            return (
              <li key={it.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  tabIndex={i === activeIndex ? 0 : -1}
                  disabled={it.disabled}
                  onClick={() => {
                    if (!it.disabled) {
                      it.onClick?.();
                      close(true);
                    }
                  }}
                  className={`${ITEM_CLASS} ${
                    it.destructive ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
                  } ${it.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {ItemIcon ? <ItemIcon size={14} /> : null}
                  {it.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
