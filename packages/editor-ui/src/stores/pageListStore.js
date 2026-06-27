import { create } from "zustand";

/**
 * Lightweight cross-component signal that the active project's page list changed
 * (create / delete / duplicate). The page list itself is owned locally by the
 * Pages screen; components that only *derive* state from it but don't own it —
 * e.g. the Sidebar's "Site preview" enable gate — subscribe to `version` so they
 * re-check when the list is mutated in place (without a route change or reload).
 *
 * @typedef {Object} PageListStore
 * @property {number} version - Bumped whenever the page list changes
 * @property {Function} notifyPagesChanged - Bump `version`
 */
const usePageListStore = create((set) => ({
  version: 0,
  notifyPagesChanged: () => set((state) => ({ version: state.version + 1 })),
}));

export default usePageListStore;
