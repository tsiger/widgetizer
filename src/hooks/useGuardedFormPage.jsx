import { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useFormNavigationGuard from "./useFormNavigationGuard";

/**
 * Standardizes the shell around guarded form pages: navigation guard wiring,
 * intentional-navigation bypass, and the dirty-dot title helper.
 *
 * Pages keep ownership of their dirty state, submission logic, and toast behavior.
 * This hook only removes the repeated skip-ref / navigate / dirty-title boilerplate.
 *
 * For stay-in-place pages (Settings, AppSettings) that don't navigate after save,
 * simply ignore navigateSafely — the guard still works with just hasUnsavedChanges.
 *
 * @param {boolean} hasUnsavedChanges - Whether the form has unsaved changes
 * @returns {{
 *   navigateSafely: (to: string, options?: object) => void,
 *   getDirtyTitle: (title: string) => React.ReactNode,
 * }}
 */
export default function useGuardedFormPage(hasUnsavedChanges) {
  const navigate = useNavigate();
  const skipRef = useRef(false);

  useFormNavigationGuard(hasUnsavedChanges, skipRef);

  /**
   * Navigate without triggering the guard.
   * Use after a successful save or on cancel.
   */
  const navigateSafely = useCallback(
    (to, options) => {
      skipRef.current = true;
      navigate(to, options);
      // Reset after the blocker has had a chance to read the ref.
      // This prevents the guard from staying permanently disabled when
      // navigation keeps the component mounted (e.g. slug-change replace).
      queueMicrotask(() => { skipRef.current = false; });
    },
    [navigate],
  );

  /**
   * Wrap a title string/node with the pink dirty-dot indicator.
   */
  const getDirtyTitle = useCallback(
    (title) => (
      <span className="flex items-center gap-2">
        {title}
        {hasUnsavedChanges && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
      </span>
    ),
    [hasUnsavedChanges],
  );

  return { navigateSafely, getDirtyTitle };
}
