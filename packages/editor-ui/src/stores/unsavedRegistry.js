import { useEffect, useRef } from "react";

const sources = new Set();

/** Adds a check for unsaved work; returns its removal. */
export function registerUnsaved(isDirty) {
  sources.add(isDirty);
  return () => sources.delete(isDirty);
}

/** Whether any screen, form or input in this window holds work that isn't saved. */
export function hasUnsavedWork() {
  for (const isDirty of sources) if (isDirty()) return true;
  return false;
}

export function useRegisterUnsaved(dirty) {
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  });
  useEffect(() => registerUnsaved(() => Boolean(dirtyRef.current)), []);
}
