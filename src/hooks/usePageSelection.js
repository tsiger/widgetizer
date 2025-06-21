import { useState } from "react";

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
