// Shared stable empty fallbacks for optional array/object props. A plain `= []`/`= {}`
// default parameter creates a fresh reference on every call where the caller omits the
// prop, which defeats a downstream `useMemo`/`useEffect` dependency on that value even
// though "empty" never actually changes — use these instead wherever such a default
// feeds a memoized value.

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});
