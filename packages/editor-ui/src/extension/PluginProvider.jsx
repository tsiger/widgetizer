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
 *   formatUploadRefusal?: (refusal: { code: string, limitBytes?: number, sizeBytes?: number, originalName: string }) => string|null,
 *   children: React.ReactNode }} props
 */
export function PluginProvider({ plugins = EMPTY_ARRAY, slots = EMPTY_OBJECT, formatUploadRefusal, children }) {
  const value = useMemo(
    () => ({
      registry: buildRegistry(plugins),
      hooks: createHookRunner(plugins),
      slots,
      formatUploadRefusal,
    }),
    [plugins, slots, formatUploadRefusal],
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
// Tolerates a missing provider: PageForm renders outside EditorShell too (its
// own tests), and with no plugins the form has no extra fields.
export const usePageSettingsFields = () => useContext(PluginContext)?.registry.pageSettingsFields ?? EMPTY_ARRAY;
export const useHookRunner = () => usePluginContext().hooks;
export const useSlot = (name) => resolveSlot(usePluginContext().slots, name);


const NO_FORMATTER = (refusals) => refusals;

/**
 * Returns a function that rewords a list of refused uploads
 * (`{ originalName, reason, code?, limitBytes?, sizeBytes? }`) with the shell's
 * `formatUploadRefusal`. A refusal the shell returns null for, or one with no
 * `code`, keeps the `reason` it came with. Without a provider or a formatter the
 * list is returned as is.
 */
export function useUploadRefusalFormatter() {
  const formatUploadRefusal = useContext(PluginContext)?.formatUploadRefusal;
  return useMemo(() => {
    if (!formatUploadRefusal) return NO_FORMATTER;
    return (refusals) =>
      refusals.map((refusal) => {
        if (!refusal?.code) return refusal;
        const text = formatUploadRefusal(refusal);
        return typeof text === "string" && text ? { ...refusal, reason: text } : refusal;
      });
  }, [formatUploadRefusal]);
}

/** Render the node a shell placed in a named slot (nothing if unset). */
export function SlotOutlet({ name }) {
  return useSlot(name) ?? null;
}
