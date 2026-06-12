// @widgetizer/editor-ui — package entry point (Sprint 1.5).
//
// The editor surface, stores, hooks, queries, API client, and the React slot
// provider move here across slices 1.5e–1.5f. So far this exposes the pure
// extension-API core (registries + lifecycle hooks + slot contract), which the
// shell wires into EditorShell in 1.5e and hosted plugins consume in 2.5.
export { buildRegistry } from "./extension/registry.js";
export { createHookRunner, HOOK_EVENTS } from "./extension/hooks.js";
export { SLOT_NAMES, resolveSlot } from "./extension/slots.js";
export {
  PluginProvider,
  SlotOutlet,
  useNavItems,
  useCommands,
  usePluginRoutes,
  useHookRunner,
  useSlot,
} from "./extension/PluginProvider.jsx";
export { builtinNavPlugin, NAV_GROUPS, groupNavItems } from "./extension/builtinNav.js";
export { EditorShell, EditorProvider, createEditorRoutes } from "./EditorShell.jsx";
