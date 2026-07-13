import { useEffect } from "react";
import useWidgetStore from "../stores/widgetStore";
import useAutoSave from "../stores/saveStore";

const GLOBAL_WIDGET_IDS = new Set(["header", "footer"]);

/**
 * True when the keydown target is a field the user is typing into — so the
 * delete shortcut never steals a Backspace/Delete from text editing.
 */
export function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return !!el.isContentEditable;
}

/**
 * Decide what (if anything) the delete key should remove, given the current
 * selection. A selected block wins over its parent widget; header/footer
 * themselves are singletons and cannot be deleted (only their blocks can).
 */
export function resolveDeleteTarget({ selectedWidgetId, selectedBlockId, selectedGlobalWidgetId }) {
  const parentId = selectedWidgetId || selectedGlobalWidgetId;

  if (selectedBlockId && parentId) {
    return {
      type: "block",
      widgetId: parentId,
      blockId: selectedBlockId,
      isGlobal: GLOBAL_WIDGET_IDS.has(parentId),
    };
  }

  if (selectedWidgetId) {
    return { type: "widget", widgetId: selectedWidgetId };
  }

  // Only a global widget selected (or nothing) → not deletable.
  return null;
}

/**
 * Editor-wide shortcut: Delete / Backspace removes the selected block or widget.
 * Reads selection + actions fresh from the stores on each keystroke, so the
 * listener is registered once and never goes stale.
 */
export default function useDeleteKeyShortcut() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const { selectedWidgetId, selectedBlockId, selectedGlobalWidgetId, deleteWidget, deleteBlock } =
        useWidgetStore.getState();

      const target = resolveDeleteTarget({ selectedWidgetId, selectedBlockId, selectedGlobalWidgetId });
      if (!target) return;

      e.preventDefault();

      if (target.type === "block") {
        const { markWidgetModified, setStructureModified } = useAutoSave.getState();
        deleteBlock(target.widgetId, target.blockId);
        // Globals persist via modifiedWidgets; page widgets via the structure flag.
        if (target.isGlobal) {
          markWidgetModified(target.widgetId);
        } else {
          setStructureModified(true);
        }
      } else {
        // deleteWidget already signals structureModified internally.
        deleteWidget(target.widgetId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
