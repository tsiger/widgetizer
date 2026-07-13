import { createContext, useContext, useMemo } from "react";
import { buildRegistry } from "./registry.js";
import { createHookRunner } from "./hooks.js";
import { resolveSlot } from "./slots.js";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "../lib/emptyValues.js";

// React layer over the pure extension core: a single provider builds the merged
// registry + hook runner from the plugin list and exposes them (plus the
// shell-provided slots) via context. EditorShell renders this once with
// `[builtinNav, ...userPlugins]`; editor components read through the hooks.

const PluginContext = createContext(null);

/**
 * @param {{ plugins?: Array<object>, slots?: Record<string, React.ReactNode>,
 *           primaryActions?: Array<object>, signals?: Record<string, () => boolean>,
 *           children: React.ReactNode }} props
 */
export function PluginProvider({
  plugins = EMPTY_ARRAY,
  slots = EMPTY_OBJECT,
  primaryActions = EMPTY_ARRAY,
  signals = EMPTY_OBJECT,
  children,
}) {
  const value = useMemo(
    () => ({
      registry: buildRegistry(plugins),
      hooks: createHookRunner(plugins),
      slots,
      primaryActions,
      signals,
    }),
    [plugins, slots, primaryActions, signals],
  );
  return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>;
}

function usePluginContext() {
  const ctx = useContext(PluginContext);
  if (!ctx) {
    throw new Error("Plugin hooks must be used within a <PluginProvider>.");
  }
  return ctx;
}

export const useNavItems = () => usePluginContext().registry.navItems;
export const useCommands = () => usePluginContext().registry.commands;
export const usePluginRoutes = () => usePluginContext().registry.routes;
export const useHookRunner = () => usePluginContext().hooks;
export const useSlot = (name) => resolveSlot(usePluginContext().slots, name);
/** The shell-provided ordered primary-action descriptors (empty if none). */
export const usePrimaryActions = () => usePluginContext().primaryActions;
/** The shell-registered toolbar signal map (name → () => boolean); empty if none. */
export const useToolbarSignals = () => usePluginContext().signals;

/** Render the node a shell placed in a named slot (nothing if unset). */
export function SlotOutlet({ name }) {
  return useSlot(name) ?? null;
}
