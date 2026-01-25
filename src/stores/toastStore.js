import { create } from "zustand";

const useToastStore = create((set) => ({
  toasts: [],

  // Show a new toast
  // Accepts an options object with optional id and duration
  showToast: (message, variant = "success", options = {}) => {
    // Use provided ID or generate one if missing
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const duration = options.duration === undefined ? 5000 : options.duration; // Default duration 5s

    set((state) => ({
      // Add the new toast with the correct ID
      toasts: [...state.toasts, { id, message, variant }],
    }));

    // Auto-dismiss after duration (if duration is not null/0)
    if (duration) {
      setTimeout(() => {
        set((state) => ({
          // Use the correct ID for removal
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      }, duration);
    }

    return id; // Return the used ID
  },

  // Dismiss a specific toast
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  // Clear all toasts
  clearToasts: () => set({ toasts: [] }),
}));

export default useToastStore;
