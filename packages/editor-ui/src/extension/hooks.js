// Lifecycle hook runner.
//
// Plugins contribute `hooks: { <event>: async (ctx, ...args) => ... }`. Hooks
// run sequentially in plugin-array order.
//   - before* : a hook returning `{ proceed: false, message }` halts the
//               operation; the first refusal wins and is returned. If none
//               refuse, `{ proceed: true }` is returned.
//   - after*  : fire-and-forget; every handler runs, errors are logged not
//               thrown, nothing is returned.

export const HOOK_EVENTS = Object.freeze([
  "beforePublish",
  "afterPublish",
  "beforeProjectDelete",
  "afterProjectDelete",
  "beforePageDelete",
  "afterPageDelete",
]);

/**
 * @param {Array<object>} plugins - frontend plugin objects (may carry `hooks`)
 */
export function createHookRunner(plugins = []) {
  function handlersFor(event) {
    const handlers = [];
    for (const plugin of plugins) {
      const fn = plugin?.hooks?.[event];
      if (typeof fn === "function") handlers.push({ name: plugin.name ?? "(unnamed)", fn });
    }
    return handlers;
  }

  return {
    /**
     * Run a `before*` event. Returns the first refusal, else `{ proceed: true }`.
     * @returns {Promise<{ proceed: boolean, message?: string }>}
     */
    async runBefore(event, ...args) {
      for (const { fn } of handlersFor(event)) {
        const result = await fn(...args);
        if (result && result.proceed === false) {
          return { proceed: false, message: result.message };
        }
      }
      return { proceed: true };
    },

    /** Run an `after*` event. Fire-and-forget; per-handler errors are logged. */
    async runAfter(event, ...args) {
      for (const { fn, name } of handlersFor(event)) {
        try {
          await fn(...args);
        } catch (err) {
          console.error(`[editor-ui] after-hook "${event}" from plugin "${name}" failed:`, err);
        }
      }
    },
  };
}
