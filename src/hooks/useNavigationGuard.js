import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import useAutoSave from "../stores/saveStore";

export default function useNavigationGuard() {
  const { hasUnsavedChanges, reset } = useAutoSave();

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
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search;
    
    return hasUnsavedChanges() && isLocationChanging;
  });

  // Handle blocked navigation with confirmation dialog
  useEffect(() => {
    if (blocker.state === "blocked") {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?\n\nClick "OK" to discard changes or "Cancel" to stay.',
      );

      if (confirmed) {
        // Reset unsaved changes state when user confirms leaving without saving
        reset();
        // Allow the navigation to proceed
        blocker.proceed();
      } else {
        // Cancel the navigation
        blocker.reset();
      }
    }
  }, [blocker, reset]);
}
