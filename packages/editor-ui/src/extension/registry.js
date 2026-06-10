// Plugin registry — merges the declarative extension points contributed by
// frontend plugin objects (and the built-in OSS registrations) into ordered
// collections the shell renders from. See design doc §4.
//
// MVP extension points (consumed here): navItems, routes, commands. Lifecycle
// `hooks` are handled separately by the hook runner (./hooks.js). A few keys are
// reserved for future extension points so plugins that use them don't trigger
// the unknown-key warning; truly unknown keys are ignored with a dev warning
// (forward compatibility — adding extension points never breaks old plugins).

const CONSUMED_KEYS = ["navItems", "routes", "commands"];

const KNOWN_KEYS = new Set([
  "name",
  "version",
  "navItems",
  "routes",
  "commands",
  "hooks", // consumed by ./hooks.js
  "activate", // escape hatch — reserved; declarative arrays only for MVP
  // Reserved future extension points (ignored for now, no warning):
  "widgetTypes",
  "inspectorPanels",
  "pageTypes",
]);

function defaultWarn(message) {
  // Dev aid only; silent in production builds.
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return;
  console.warn(message);
}

/**
 * Build the merged registry from an ordered list of frontend plugin objects.
 * The shell composes the list as `[builtinPlugin, ...userPlugins]`, so built-in
 * entries come first and plugin-array order is preserved within each collection.
 *
 * @param {Array<object>} plugins
 * @param {{ warn?: (msg: string) => void }} [opts]
 * @returns {{ navItems: object[], routes: object[], commands: object[] }}
 */
export function buildRegistry(plugins = [], { warn = defaultWarn } = {}) {
  const navItems = [];
  const routes = [];
  const commands = [];

  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== "object") continue;
    const name = plugin.name ?? "(unnamed)";

    for (const key of Object.keys(plugin)) {
      if (!KNOWN_KEYS.has(key)) {
        warn(`[editor-ui] plugin "${name}" has unknown key "${key}" — ignored.`);
      }
    }

    const tag = (entry) => ({ ...entry, pluginName: name });
    for (const item of plugin.navItems ?? []) navItems.push(tag(item));
    for (const route of plugin.routes ?? []) routes.push(tag(route));
    for (const command of plugin.commands ?? []) commands.push(tag(command));
  }

  return { navItems, routes, commands };
}

export { CONSUMED_KEYS, KNOWN_KEYS };
