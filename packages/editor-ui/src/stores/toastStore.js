import { create } from "zustand";

const ENTER_DURATION_MS = 16;
const EXIT_DURATION_MS = 300;
const enterTimers = new Map();
const autoDismissTimers = new Map();
const exitTimers = new Map();

function clearToastTimers(id) {
  const enterTimer = enterTimers.get(id);
  if (enterTimer) {
    clearTimeout(enterTimer);
    enterTimers.delete(id);
  }

  const autoDismissTimer = autoDismissTimers.get(id);
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer);
    autoDismissTimers.delete(id);
  }

  const exitTimer = exitTimers.get(id);
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimers.delete(id);
  }
}

/**
 * Zustand store for managing toast notifications.
 * Supports multiple simultaneous toasts with auto-dismiss and manual dismissal.
 *
 * @typedef {Object} Toast
 * @property {string} id - Unique identifier for the toast
 * @property {string} message - The message to display
 * @property {string} variant - Toast type: 'success', 'error', 'warning', or 'info'
 *
 * @typedef {Object} ToastStore
 * @property {Array<Toast>} toasts - Array of currently visible toasts
 * @property {Function} showToast - Display a new toast notification
 * @property {Function} dismissToast - Remove a specific toast by ID
 * @property {Function} clearToasts - Remove all visible toasts
 */

const useToastStore = create((set, get) => ({
  toasts: [],

  // Show a new toast
  // Accepts an options object with optional id and duration
  showToast: (message, variant = "success", options = {}) => {
    // Use provided ID or generate one if missing
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const duration = options.duration === undefined ? 5000 : options.duration; // Default duration 5s

    clearToastTimers(id);

    set((state) => ({
      toasts: [...state.toasts.filter((toast) => toast.id !== id), { id, message, variant, phase: "entering" }],
    }));

    const enterTimer = setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.map((toast) => (toast.id === id ? { ...toast, phase: "visible" } : toast)),
      }));
      enterTimers.delete(id);
    }, ENTER_DURATION_MS);

    enterTimers.set(id, enterTimer);

    // Auto-dismiss after duration (if duration is not null/0)
    if (duration) {
      const autoDismissTimer = setTimeout(() => {
        get().dismissToast(id);
      }, duration);

      autoDismissTimers.set(id, autoDismissTimer);
    }

    return id; // Return the used ID
  },

  // Dismiss a specific toast
  dismissToast: (id) => {
    const toast = get().toasts.find((item) => item.id === id);
    if (!toast || toast.phase === "exiting") {
      return;
    }

    const enterTimer = enterTimers.get(id);
    if (enterTimer) {
      clearTimeout(enterTimer);
      enterTimers.delete(id);
    }

    const autoDismissTimer = autoDismissTimers.get(id);
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimers.delete(id);
    }

    set((state) => ({
      toasts: state.toasts.map((item) => (item.id === id ? { ...item, phase: "exiting" } : item)),
    }));

    const exitTimer = setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id),
      }));
      exitTimers.delete(id);
    }, EXIT_DURATION_MS);

    exitTimers.set(id, exitTimer);
  },

  // Clear all toasts
  clearToasts: () => {
    get().toasts.forEach((toast) => clearToastTimers(toast.id));
    set({ toasts: [] });
  },
}));

export default useToastStore;
