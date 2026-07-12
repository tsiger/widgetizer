// Toolbar primary-action model — descriptor contract + the named-signal vocabulary
// (Model C) the editor's primary-action control renders from. Framework-free logic
// (testable without rendering) — the only React-adjacent dependency is the `icon`
// component reference on DEFAULT_PRIMARY_ACTIONS, never rendered here.
//
// A ToolbarAction is pure data:
//   { id, command, labelKey, titleKey?, busyLabelKey?, enabledWhen?, busyWhen?, icon?, menuItems? }
// `command` is a registry command id (behavior lives there, not in the descriptor).
// `menuItems` are the split-button dropdown entries — one level deep only.

import { Save } from "lucide-react";
import useAutoSave from "../stores/saveStore.js";
import { defaultWarn } from "./registry.js";

/** Builtin enable/busy signals OSS resolves against the save store. A shell may
 *  register additional signals of its own; see PluginProvider. */
export const TOOLBAR_SIGNALS = Object.freeze(["hasUnsavedChanges", "isSaving"]);

/**
 * Resolve an action's live view state from a merged signal map.
 * @param {object} action
 * @param {Record<string, boolean>} signals - merged builtin ∪ shell signal VALUES
 * @param {{ pending?: boolean }} [opts] - the control's intrinsic in-flight state
 * @returns {{ enabled: boolean, busy: boolean, labelKey: string }}
 */
export function resolveActionState(action, signals = {}, { pending = false } = {}) {
  const read = (name) => {
    if (name == null) return undefined;
    if (!Object.prototype.hasOwnProperty.call(signals, name)) {
      defaultWarn(`[editor-ui] toolbar action "${action?.id}" references unknown signal "${name}".`);
      return false;
    }
    return Boolean(signals[name]);
  };
  const enabled = action.enabledWhen == null ? true : read(action.enabledWhen);
  const busy = pending || (action.busyWhen == null ? false : read(action.busyWhen));
  const labelKey = busy && action.busyLabelKey ? action.busyLabelKey : action.labelKey;
  return { enabled, busy, labelKey };
}

/**
 * Validate a shell-provided list against the known signal + command vocabularies.
 * Throws (naming the offender) so a stale reference fails loudly — the shell runs
 * this in a test so an OSS rename turns CI red. `signalNames`/`commandIds` extend
 * the builtin sets (builtin ∪ shell). commandIds is only enforced when non-empty.
 * @param {object[]} actions
 * @param {{ signalNames?: Iterable<string>, commandIds?: Iterable<string> }} [vocab]
 */
export function validatePrimaryActions(actions, { signalNames = [], commandIds = [] } = {}) {
  const signalSet = new Set([...TOOLBAR_SIGNALS, ...signalNames]);
  const commandSet = new Set(commandIds);

  const checkOne = (action, path) => {
    if (!action || typeof action !== "object") throw new Error(`[editor-ui] ${path} is not an object`);
    if (!action.id) throw new Error(`[editor-ui] ${path} is missing "id"`);
    if (!action.command) throw new Error(`[editor-ui] action "${action.id}" (${path}) is missing "command"`);
    if (!action.labelKey) throw new Error(`[editor-ui] action "${action.id}" (${path}) is missing "labelKey"`);
    if (commandSet.size && !commandSet.has(action.command))
      throw new Error(`[editor-ui] action "${action.id}" references unknown command "${action.command}"`);
    for (const key of ["enabledWhen", "busyWhen"]) {
      const name = action[key];
      if (name != null && !signalSet.has(name))
        throw new Error(`[editor-ui] action "${action.id}" references unknown signal "${name}" (${key})`);
    }
  };

  for (const [i, action] of (actions ?? []).entries()) {
    checkOne(action, `primaryActions[${i}]`);
    for (const [j, item] of (action.menuItems ?? []).entries()) {
      if (item && item.menuItems)
        throw new Error(`[editor-ui] menu item "${item.id}" must not nest its own menuItems`);
      checkOne(item, `primaryActions[${i}].menuItems[${j}]`);
    }
  }
}

/** OSS standalone default: a single plain Save button. */
export const DEFAULT_PRIMARY_ACTIONS = Object.freeze([
  Object.freeze({
    id: "save",
    command: "save",
    labelKey: "pageEditor.toolbar.save",
    busyLabelKey: "pageEditor.toolbar.saving",
    enabledWhen: "hasUnsavedChanges",
    busyWhen: "isSaving",
    titleKey: "pageEditor.toolbar.saveHint",
    icon: Save,
  }),
]);

/** Built-in toolbar commands, contributed through the same registry as user plugins
 *  (EditorProvider composes `[builtinNavPlugin, builtinToolbarPlugin, ...plugins]`).
 *  The single `save` path shared by the button, Ctrl+S, and any dropdown "Save". */
export const builtinToolbarPlugin = {
  name: "builtin-toolbar",
  commands: [
    {
      id: "save",
      // The overlapping-save guard (manual vs. autosave, in either firing
      // order) lives in saveStore's save() itself now — see its comment —
      // since a guard here alone can't catch the autosave timer's own direct
      // get().save(true) call, which never goes through this command.
      run: () => useAutoSave.getState().save(false),
    },
  ],
};

/** Read the builtin signal VALUES from the save store (pure read; the React control
 *  subscribes to the store and calls this during render). */
export function readBuiltinToolbarSignals() {
  const s = useAutoSave.getState();
  return { hasUnsavedChanges: s.hasUnsavedChanges(), isSaving: s.isSaving };
}
