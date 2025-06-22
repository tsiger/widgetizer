import { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAutoSave from "../stores/saveStore";

export default function useNavigationGuard() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Layer 2: Internal navigation guard - provides a guarded navigate function
  const guardedNavigate = useCallback(
    (to, options = {}) => {
      if (hasUnsavedChanges()) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?\n\nClick "OK" to discard changes or "Cancel" to stay.',
        );

        if (!confirmed) {
          return false;
        }

        // Reset unsaved changes state when user confirms leaving without saving
        reset();
      }

      navigate(to, options);
      return true;
    },
    [navigate, hasUnsavedChanges, reset],
  );

  // Helper function to check if we have unsaved changes
  const checkUnsavedChanges = useCallback(() => {
    return hasUnsavedChanges();
  }, [hasUnsavedChanges]);

  return {
    guardedNavigate,
    hasUnsavedChanges: checkUnsavedChanges(),
    checkUnsavedChanges,
  };
}
