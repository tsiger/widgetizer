import { createElement } from "react";
import useConfirmationModal from "./useConfirmationModal";
import ConfirmationModal from "../components/ui/ConfirmationModal";

/**
 * Thin wrapper around useConfirmationModal that reduces repeated
 * modal-wiring boilerplate on list pages with destructive actions.
 *
 * Returns:
 * - `confirm(options)` — open the confirmation dialog (same options as openModal)
 * - `confirmationModal` — a ready-to-render <ConfirmationModal /> element
 *
 * Pages still own their mutation logic and localized copy.
 *
 * @param {Function} onConfirm - Callback executed when the user confirms, receives modal data
 * @returns {{ confirm: Function, confirmationModal: React.ReactElement }}
 */
export default function useConfirmationAction(onConfirm) {
  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(onConfirm);

  const confirmationModal = createElement(ConfirmationModal, {
    isOpen: modalState.isOpen,
    onClose: closeModal,
    onConfirm: handleConfirm,
    title: modalState.title,
    message: modalState.message,
    confirmText: modalState.confirmText,
    cancelText: modalState.cancelText,
    variant: modalState.variant,
  });

  return { confirm: openModal, confirmationModal };
}
