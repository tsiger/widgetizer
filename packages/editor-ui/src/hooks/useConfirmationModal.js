import { useState } from "react";

/**
 * Hook for managing confirmation modal state and actions.
 * Provides a reusable pattern for confirmation dialogs with customizable messages and variants.
 *
 * @param {Function} onConfirm - Callback executed when user confirms the action, receives modal data as argument
 * @returns {{
 *   modalState: {isOpen: boolean, title: string, message: string, confirmText: string, cancelText: string, variant: string, data: any},
 *   openModal: (options?: Object) => void,
 *   closeModal: () => void,
 *   handleConfirm: () => void
 * }} Modal state and control functions
 * @property {Object} modalState - Current state of the modal including visibility and content
 * @property {Function} openModal - Open the modal with optional custom title, message, and data
 * @property {Function} closeModal - Close the modal without triggering confirmation
 * @property {Function} handleConfirm - Trigger the onConfirm callback and close the modal
 */
export default function useConfirmationModal(onConfirm) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    data: null,
  });

  const openModal = (options = {}) => {
    setModalState({
      ...modalState,
      isOpen: true,
      ...options,
    });
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false,
    });
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(modalState.data);
    }
    closeModal();
  };

  return {
    modalState,
    openModal,
    closeModal,
    handleConfirm,
  };
}
