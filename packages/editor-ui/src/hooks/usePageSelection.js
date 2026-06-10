import { useState } from "react";

/**
 * Hook for managing page selection state in the pages list.
 * Supports single and multi-select operations for bulk actions.
 *
 * @returns {{
 *   selectedPages: Array<string>,
 *   togglePageSelection: (pageId: string) => void,
 *   selectAllPages: (pageIds: Array<string>) => void,
 *   clearSelection: () => void,
 *   isAllSelected: (pages: Array<{id: string}>) => boolean
 * }} Page selection state and handlers
 * @property {Array<string>} selectedPages - Array of selected page IDs
 * @property {Function} togglePageSelection - Add or remove a page from selection
 * @property {Function} selectAllPages - Select all pages by their IDs
 * @property {Function} clearSelection - Deselect all pages
 * @property {Function} isAllSelected - Check if all provided pages are selected
 */
export function usePageSelection() {
  const [selectedPages, setSelectedPages] = useState([]);

  const togglePageSelection = (pageId) => {
    setSelectedPages((prev) => {
      if (prev.includes(pageId)) {
        return prev.filter((id) => id !== pageId);
      } else {
        return [...prev, pageId];
      }
    });
  };

  const selectAllPages = (pageIds) => {
    setSelectedPages(pageIds);
  };

  const clearSelection = () => {
    setSelectedPages([]);
  };

  const isAllSelected = (pages) => {
    return (
      pages.length > 0 &&
      selectedPages.length === pages.length &&
      pages.every((page) => selectedPages.includes(page.id))
    );
  };

  return {
    selectedPages,
    togglePageSelection,
    selectAllPages,
    clearSelection,
    isAllSelected,
  };
}
