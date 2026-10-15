// Mutation-success notification seam. apiFetch announces every successful
// modifying request (method + path) here; an embedding shell registers a
// listener to react (module-registry shape, like activeProjectId.js and
// apiBase.js, so apiFetch stays free of store imports). Listener errors are
// logged and swallowed — a subscriber must never break the request that
// triggered it.

const listeners = new Set();

/**
 * Register a handler invoked with `{ method, path }` after every successful
 * modifying request. Returns an unsubscribe function.
 */
export function subscribeMutationSuccess(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

/** Internal — called by apiFetch. */
export function notifyMutationSuccess(event) {
  for (const handler of listeners) {
    try {
      const result = handler(event);
      // A listener can return a rejecting promise (async handler) instead of
      // throwing synchronously; without this, that rejection is unhandled.
      if (result && typeof result.then === "function") {
        result.catch((error) => console.error("[mutationEvents] listener failed:", error));
      }
    } catch (error) {
      console.error("[mutationEvents] listener failed:", error);
    }
  }
}
