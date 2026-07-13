import { createContext, useContext, useMemo } from "react";
import { buildRegistry } from "./registry.js";
import { createHookRunner } from "./hooks.js";
import { resolveSlot } from "./slots.js";

// React layer over the pure extension core: a single provider builds the merged
// registry + hook runner from the plugin list and exposes them (plus the
// shell-provided slots) via context. EditorShell renders this once with
// `[builtinNav, ...userPlugins]`; editor components read through the hooks.

const PluginContext = createContext(null);

/**
 * @param {{ plugins?: Array<object>, slots?: Record<string, React.ReactNode>, children: React.ReactNode }} props
 */
export function PluginProvider({ plugins = [], slots = {}, children }) {
  const value = useMemo(
    () => ({
      registry: buildRegistry(plugins),
      hooks: createHookRunner(plugins),
      slots,
    }),
    [plugins, slots],
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

/** Render the node a shell placed in a named slot (nothing if unset). */
export function SlotOutlet({ name }) {
  return useSlot(name) ?? null;
}
