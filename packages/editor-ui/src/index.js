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
// Per-window UI surfaces. EditorProvider mounts neither — the embedding shell
// mounts each exactly once (toast outlet; the confirm dialog the navigation
// guards prompt through — useConfirm() throws without the provider above it).
export { default as ToastContainer } from "./components/ui/ToastContainer.jsx";
export { ConfirmProvider, useConfirm } from "./components/ui/ConfirmProvider.jsx";
// Resolves a collection schema's PascalCase `icon` name to a lucide-react component
// (fallback: Database). Shared so a host reproducing the collection nav outside the
// editor shell renders the same per-collection icons as editor-ui's Sidebar.
export { resolveLucideIcon } from "./utils/lucideIcon.js";
// Fires `{ method, path }` after every successful (`response.ok`) modifying
// apiFetch call; an embedding shell subscribes to react to mutations.
export { subscribeMutationSuccess } from "./lib/mutationEvents.js";
// A two-part button: primary action + optional dropdown menu. Presentational
// only — the caller resolves labels/handlers/enabled state per half. Implements
// WAI-ARIA menu-button pattern; open/close/outside/Escape are encapsulated.
export { default as SplitButton } from "./components/ui/SplitButton.jsx";
