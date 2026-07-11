import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import SplitButton from "../ui/SplitButton.jsx";
import { usePrimaryActions, useToolbarSignals, useCommands } from "../../extension/PluginProvider.jsx";
import { resolveActionState, readBuiltinToolbarSignals } from "../../extension/toolbar.js";
import useAutoSave from "../../stores/saveStore.js";
import usePageStore from "../../stores/pageStore.js";
import useProjectStore from "../../stores/projectStore.js";
import useToastStore from "../../stores/toastStore.js";

// The page-editor's primary-action control. Reads the shell's ordered descriptors
// and renders the first as a SplitButton, dispatching each action's `command`
// through a { projectId, runCommand } ctx, tracking in-flight busy per action, and
// surfacing failures via a toast. Enable/busy come from the merged signal map
// (builtin ∪ shell-registered; builtins win). Publish-agnostic.
export default function PrimaryActionControl() {
  const { t } = useTranslation();
  const actions = usePrimaryActions();
  const shellSignals = useToolbarSignals();
  const commands = useCommands();
  const activeProjectId = useProjectStore((s) => s.activeProject?.id);
  const showToast = useToastStore((s) => s.showToast);

  // Re-render on save-store changes (dirty/saving flags) and on undo/redo, mirroring
  // the previous EditorTopBar save button's reactivity.
  useAutoSave();
  const [, force] = useState(0);
  useEffect(() => usePageStore.temporal.subscribe(() => force((c) => c + 1)), []);

  const [pending, setPending] = useState({}); // { [actionId]: boolean }

  const runCommand = useCallback(
    (id, ctx) => {
      const cmd = commands.find((c) => c.id === id);
      if (!cmd) return Promise.reject(new Error(`Unknown command "${id}"`));
      return Promise.resolve(cmd.run(ctx));
    },
    [commands],
  );

  const dispatch = useCallback(
    async (action) => {
      const ctx = { projectId: activeProjectId, runCommand: (id) => runCommand(id, ctx) };
      setPending((p) => ({ ...p, [action.id]: true }));
      try {
        await runCommand(action.command, ctx);
      } catch (err) {
        console.error(`[editor-ui] toolbar command "${action.command}" failed:`, err);
        showToast(t("pageEditor.toolbar.actionFailed"), "error");
      } finally {
        setPending((p) => ({ ...p, [action.id]: false }));
      }
    },
    [activeProjectId, runCommand, showToast, t],
  );

  // Merge shell signals with builtins; builtins win on a name collision.
  const shellValues = Object.fromEntries(
    Object.entries(shellSignals).map(([name, getter]) => [name, Boolean(getter())]),
  );
  const signals = { ...shellValues, ...readBuiltinToolbarSignals() };

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
