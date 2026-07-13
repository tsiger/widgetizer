import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import SplitButton from "../ui/SplitButton.jsx";
import { usePrimaryActions, useToolbarSignals } from "../../extension/PluginProvider.jsx";
import { resolveActionState, readBuiltinToolbarSignals, TOOLBAR_SIGNALS } from "../../extension/toolbar.js";
import { defaultWarn } from "../../extension/registry.js";
import { useDispatchCommand } from "../../hooks/useDispatchCommand.js";
import useAutoSave from "../../stores/saveStore.js";
import usePageStore from "../../stores/pageStore.js";

// The page-editor's primary-action control. Reads the shell's ordered descriptors
// and renders the first as a SplitButton, dispatching each action's `command`
// through useDispatchCommand's shared { projectId, runCommand, hooks } ctx —
// the same seam the topbar's Ctrl+S shortcut uses, so ctx shape, busy-tracking,
// and error-toast behavior can't drift between the click and keyboard paths.
// Enable/busy come from the merged signal map (builtin ∪ shell-registered;
// builtins win). Publish-agnostic.
export default function PrimaryActionControl() {
  const { t } = useTranslation();
  const actions = usePrimaryActions();
  const shellSignals = useToolbarSignals();
  const { dispatch: dispatchCommand, pending } = useDispatchCommand();

  // Re-render on save-store changes (dirty/saving flags) and on undo/redo, mirroring
  // the previous EditorTopBar save button's reactivity.
  useAutoSave();
  const [, force] = useState(0);
  useEffect(() => usePageStore.temporal.subscribe(() => force((c) => c + 1)), []);

  const dispatch = (action) => dispatchCommand(action.id, action.command);

  // Merge shell signals with builtins; builtins win on a name collision.
  const shellValues = Object.fromEntries(
    Object.entries(shellSignals).map(([name, getter]) => [name, Boolean(getter())]),
  );
  const signals = { ...shellValues, ...readBuiltinToolbarSignals() };

  // A shell registering a signal named "hasUnsavedChanges"/"isSaving" (the
  // reserved builtin names) gets silently overwritten by the spread above —
  // warn once per distinct collision set (keyed on the name, not the value,
  // so this doesn't fire on every render) rather than let it be a silent no-op.
  const collidingNames = Object.keys(shellSignals)
    .filter((name) => TOOLBAR_SIGNALS.includes(name))
    .sort()
    .join(",");
  useEffect(() => {
    if (collidingNames) {
      defaultWarn(
        `[editor-ui] shell-registered signal(s) "${collidingNames}" collide with reserved TOOLBAR_SIGNALS names — the shell's getter is discarded, the builtin value wins.`,
      );
    }
  }, [collidingNames]);

  const toView = (action) => {
    const st = resolveActionState(action, signals, { pending: !!pending[action.id] });
    return {
      id: action.id,
      label: t(st.labelKey),
      title: action.titleKey ? t(action.titleKey) : undefined,
      icon: action.icon,
      disabled: !st.enabled || st.busy,
      busy: st.busy,
      destructive: action.destructive,
      onClick: () => dispatch(action),
    };
  };

  if (!actions.length) return null;
  const [primaryAction] = actions; // one control today; extra top-level entries are ignored for now
  const primaryView = toView(primaryAction);
  const items = (primaryAction.menuItems ?? []).map(toView);

  return <SplitButton primary={primaryView} items={items} menuLabel={t("pageEditor.toolbar.moreActions")} />;
}
