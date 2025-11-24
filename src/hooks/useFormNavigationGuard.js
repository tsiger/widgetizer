import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Navigation guard hook to prevent users from leaving pages with unsaved changes
 * 
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 * 
 * Features:
 * - Blocks internal navigation (React Router) with confirmation dialog
 * - Blocks external navigation (tab close, refresh) with browser dialog
 * - Consistent with PageEditor's useNavigationGuard pattern
 * 
 * Usage:
 * ```javascript
 * const [isDirty, setIsDirty] = useState(false);
 * useFormNavigationGuard(isDirty);
 * ```
 */
export default function useFormNavigationGuard(hasUnsavedChanges) {
  // Layer 1: Browser navigation (beforeunload) - handles tab closing, URL changes, etc.
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Chrome requires returnValue to be set
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Layer 2: Internal navigation blocking using React Router's useBlocker
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // Block navigation if there are unsaved changes and the location is actually changing
    const isLocationChanging =
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search;
    
    return hasUnsavedChanges && isLocationChanging;
  });

  // Handle blocked navigation with confirmation dialog
  useEffect(() => {
    if (blocker.state === "blocked") {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?\n\nClick "OK" to discard changes or "Cancel" to stay.'
      );

      if (confirmed) {
        // Allow the navigation to proceed
        blocker.proceed();
      } else {
        // Cancel the navigation
        blocker.reset();
      }
    }
  }, [blocker]);
}
