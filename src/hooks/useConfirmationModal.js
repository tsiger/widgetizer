import { useState } from "react";

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
