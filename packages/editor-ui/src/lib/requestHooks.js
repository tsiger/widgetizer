// Request hooks seam. An embedding shell can add headers to every editor
// request and see every response's status and headers, for both transports
// (apiFetch and the XHR uploads). Module registry, like mutationEvents.js, so
// the request code stays free of store imports. Without hooks nothing is added
// or observed. Hook errors are logged and swallowed: a hook must never break a
// request.

let hooks = {};

/**
 * Register the hooks; replaces any registered before. Returns a function that
 * removes them.
 * @param {{
 *   requestHeaders?: () => Record<string, string> | null | undefined | Promise<Record<string, string> | null | undefined>,
 *   observeResponse?: (response: { status: number, getHeader: (name: string) => string | null, method: string, path: string }) => void,
 * }} next
 */
export function setRequestHooks(next = {}) {
  const registered = { ...next };
  hooks = registered;
  return () => {
    if (hooks === registered) hooks = {};
  };
}

/**
 * Internal — the extra headers for a request (an empty object without a hook).
 * The hook may answer asynchronously (a shell fetching a fresh auth token).
 */
export async function hookHeaders() {
  try {
    return { ...((await hooks.requestHeaders?.()) ?? {}) };
  } catch (error) {
    console.error("[requestHooks] requestHeaders failed:", error);
    return {};
  }
}

/** Internal — a response arrived (not called when the request never reached the server). */
export function observeHookResponse(response) {
  try {
    hooks.observeResponse?.(response);
  } catch (error) {
    console.error("[requestHooks] observeResponse failed:", error);
  }
}
