import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../components/ui/ConfirmProvider";
import useAutoSave from "../stores/saveStore";

/**
 * Hook for preventing navigation when there are unsaved changes in the page editor.
 * Integrates with the auto-save store to check for pending changes.
 *
 * Features:
 * - Blocks browser navigation (tab close, refresh) with native browser confirmation
 * - Blocks internal React Router navigation with the in-app confirmation dialog
 * - Automatically resets unsaved changes state when user confirms leaving
 *
 * @returns {void} This hook has no return value; it manages side effects only
 */
export default function useNavigationGuard() {
  const { hasUnsavedChanges, reset } = useAutoSave();
  const confirm = useConfirm();
  const { t } = useTranslation();

  // Layer 1: Browser navigation (beforeunload) - handles tab closing, URL changes, etc.
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = ""; // Chrome requires returnValue to be set
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Layer 2: Internal navigation blocking using React Router's useBlocker
  // This automatically intercepts ALL navigation attempts (Link clicks, navigate() calls, etc.)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // Block navigation if there are unsaved changes and the location is actually changing
    // Check both pathname and search params (for page editor dropdown switching)
    const isLocationChanging =
      currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search;

    return hasUnsavedChanges() && isLocationChanging;
  });

  // react-router hands back a new blocker object on every render, so depending
  // on `blocker` would re-run this effect — and its cleanup — while the prompt
  // is still open. That cleanup sets `cancelled`, which races the user's answer:
  // if React's effect flush beats the promise microtask, the answer is dropped
  // and the navigation silently dies. Keying off `blocker.state` and reading the
  // current blocker from a ref means the effect runs once per blocked
  // navigation, so no cleanup can land between the click and the handler.
  const blockerRef = useRef(blocker);
  useEffect(() => {
    blockerRef.current = blocker;
  });

  // Handle blocked navigation with the in-app confirmation dialog. Asking is
  // async now (window.confirm blocked the thread; see ConfirmProvider for why
  // it had to go), so the blocker simply stays "blocked" until the user answers.
  useEffect(() => {
    if (blocker.state !== "blocked") return;

    let cancelled = false;
    const pending = confirm({
      title: t("common.leaveConfirm.title"),
      message: t("common.leaveConfirm.message"),
      confirmText: t("common.leaveConfirm.confirm"),
      cancelText: t("common.leaveConfirm.cancel"),
      variant: "warning",
    });

    pending.then((confirmed) => {
      if (cancelled) return;
      if (confirmed) {
        // Reset unsaved changes state when user confirms leaving without saving
        reset();
        // Allow the navigation to proceed
        blockerRef.current.proceed();
      } else {
        // Cancel the navigation
        blockerRef.current.reset();
      }
    });

    // Unmounting mid-prompt (e.g. a project switch tearing down the editor)
    // must not leave an orphaned dialog on screen.
    return () => {
      cancelled = true;
      pending.cancel();
    };
  }, [blocker.state, reset, confirm, t]);
}
