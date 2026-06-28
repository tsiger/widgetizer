// @widgetizer/editor-ui package entry point.
//
// Exposes the editor surface, extension registries, lifecycle hooks, slots,
// shell components, stores, hooks, queries, and API helpers.
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
