import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCommands, useHookRunner } from "../extension/PluginProvider.jsx";
import useProjectStore from "../stores/projectStore.js";
import useToastStore from "../stores/toastStore.js";

// Shared dispatch seam for anything that triggers a registry command outside
// a raw `cmd.run(...)` call — the toolbar's click path (PrimaryActionControl)
// and its keyboard-shortcut path (e.g. Ctrl+S) both go through this, so ctx
// shape, busy-tracking, and error-toast behavior can't drift between them.
export function useDispatchCommand() {
  const { t } = useTranslation();
  const commands = useCommands();
  const hooks = useHookRunner();
  const activeProjectId = useProjectStore((s) => s.activeProject?.id);
  const showToast = useToastStore((s) => s.showToast);

  const [pending, setPending] = useState({}); // { [actionId]: boolean }

  const runCommand = useCallback(
    (id, ctx) => {
      const cmd = commands.find((c) => c.id === id);
      if (!cmd) {
        const err = new Error(`Unknown command "${id}"`);
        // Developer-facing (a stale/missing command registration), not meant
        // for a user-visible toast — dispatch()'s catch checks this flag to
        // exclude it from the direct-message path below.
        err.internal = true;
        return Promise.reject(err);
      }
      return Promise.resolve(cmd.run(ctx));
    },
    [commands],
  );

  const dispatch = useCallback(
    async (actionId, commandId) => {
      const ctx = { projectId: activeProjectId, hooks, runCommand: (id) => runCommand(id, ctx) };
      setPending((p) => ({ ...p, [actionId]: true }));
      try {
        await runCommand(commandId, ctx);
      } catch (err) {
        console.error(`[editor-ui] toolbar command "${commandId}" failed:`, err);
        // Thrown command errors in this codebase are already human-phrased
        // (project-mismatch, unsaved-changes, veto, and network-error text) —
        // show it directly so callers like hosted's savePublish, which throw
        // a specific message per failure case, aren't flattened into one
        // generic toast. Falls back to the generic translated message for
        // anything that isn't a genuine, user-facing Error: a non-Error
        // rejection (null/undefined/bare value — err.message would throw),
        // this hook's own internal errors (e.g. "Unknown command", flagged
        // above), or an empty message (indistinguishable from "none set" —
        // an Error's own default message is itself "").
        const message = err instanceof Error && !err.internal ? err.message : "";
        showToast(message || t("pageEditor.toolbar.actionFailed"), "error");
      } finally {
        setPending((p) => ({ ...p, [actionId]: false }));
      }
    },
    [activeProjectId, hooks, runCommand, showToast, t],
  );

  return { dispatch, pending };
}
