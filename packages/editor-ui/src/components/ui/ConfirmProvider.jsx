import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";

/**
 * App-level confirmation dialog.
 *
 * Exists because `window.confirm()` is unusable in the Electron build: on
 * Windows the native dialog leaves the window believing it has lost focus, so
 * every input goes dead until the user alt-tabs away and back. The bug is
 * upstream, confirmed, and open since 2019 (electron/electron#31917, #40212,
 * #41603), so the only reliable fix is not calling the native dialog at all.
 *
 * Unlike `useConfirmationAction` — which returns an element the page must
 * render — this mounts once for the whole editor and hands out an awaitable
 * `confirm()`. That lets side-effect-only hooks (the navigation guards) ask for
 * confirmation without their host pages knowing anything about it.
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  // `null` means closed; any object is the open dialog's options.
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  // Settles the pending promise at most once. The modal's confirm button fires
  // onConfirm() *and* onClose(), so the second call must be a no-op rather than
  // resolving the same request twice with conflicting answers.
  const settle = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOptions(null);
    if (resolve) resolve(result);
  }, []);

  /**
   * Open the dialog and resolve to the user's answer.
   *
   * @param {object} [opts] - title, message, confirmText, cancelText, variant
   * @returns {Promise<boolean> & { cancel: () => void }} resolves true on
   *   confirm, false on cancel/Escape/backdrop. `cancel()` closes the dialog and
   *   resolves false — but only while *this* request is the open one, so a
   *   caller unmounting mid-prompt can clean up without closing someone else's
   *   dialog.
   */
  const confirm = useCallback(
    (opts = {}) => {
      // A second request while one is open supersedes it. Resolving the old one
      // false keeps its caller from awaiting a promise that can never settle.
      if (resolverRef.current) {
        const superseded = resolverRef.current;
        resolverRef.current = null;
        superseded(false);
      }

      let ownResolve;
      const promise = new Promise((resolve) => {
        ownResolve = resolve;
        resolverRef.current = resolve;
        setOptions(opts);
      });

      promise.cancel = () => {
        if (resolverRef.current === ownResolve) settle(false);
      };

      return promise;
    },
    [settle],
  );

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmationModal
        isOpen={options !== null}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
        title={options?.title}
        message={options?.message}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant ?? "danger"}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * @returns {(opts?: object) => Promise<boolean> & { cancel: () => void }}
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmProvider>.");
  }
  return ctx.confirm;
}
