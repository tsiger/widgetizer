/**
 * Creates a lightweight async request gate that tracks request tokens
 * and lets callers detect whether their response is still current.
 *
 * Usage:
 *   const gate = createAsyncRequestGate();
 *   const token = gate.start();
 *   const data = await fetchSomething();
 *   if (gate.isCurrent(token)) { /* safe to use data * / }
 *
 * Calling start() again automatically invalidates all prior tokens.
 * Calling invalidate() drops any in-flight token without starting a new one.
 */
export function createAsyncRequestGate() {
  let currentToken = 0;

  return {
    /** Start a new request. Returns a token. Invalidates all prior tokens. */
    start() {
      return ++currentToken;
    },

    /** Check whether the given token is still the active one. */
    isCurrent(token) {
      return token === currentToken;
    },

    /** Invalidate all prior tokens without starting a new request. */
    invalidate() {
      ++currentToken;
    },
  };
}
