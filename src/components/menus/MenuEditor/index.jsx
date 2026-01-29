import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Plus } from "lucide-react";
import { debounce, isEqual } from "lodash";

import Button from "../../ui/Button";
import SortableList from "./SortableList";
import DragOverlayComponent from "./DragOverlay";
import { ensureIds, findItemById, getItemAtPath, generateId } from "./utils/menuUtils";
import { getAllPages } from "../../../queries/pageManager";

function MenuEditor({ initialItems = [], onChange, onDeleteItem }) {
  // Ensure all items have IDs
  const [items, setItems] = useState(() => ensureIds(initialItems));
  const [expandedItems, setExpandedItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [pages, setPages] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Add this to track if initialItems have changed
  const initialItemsRef = useRef(initialItems);

  // Cache for findItemById results
  const itemCache = useRef(new Map());

  // Set up sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch pages for the link selector - use uuid as value for stable references
  useEffect(() => {
    async function fetchPages() {
      try {
        const allPages = await getAllPages();
        setPages(
          allPages.map((p) => ({
            value: p.uuid, // Use uuid as value for stable reference across renames
            label: p.name,
            slug: p.slug, // Keep slug for deriving href
            isPage: true,
          })),
        );
      } catch (error) {
        console.error("Failed to load pages:", error);
      }
    }
    fetchPages();
  }, []);

  // Update items when initialItems change
  useEffect(() => {
    // Only update local state if the *contents* differ
    if (initialItems !== initialItemsRef.current) {
      if (!isEqual(initialItems, items)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(ensureIds(initialItems));
      }
      initialItemsRef.current = initialItems;
    }
  }, [initialItems, items]);

  // Create a debounced version of onChange
  const debouncedOnChange = useMemo(
    () =>
      debounce((newItems) => {
        // Don't call onChange if we're in the middle of a drag operation
        if (!activeId) {
          onChange(newItems);
        }
      }, 300),
    [onChange, activeId],
  );

  // Only call onChange when items actually change
  useEffect(() => {
    // Don't trigger onChange during drag operations
    if (!activeId) {
      debouncedOnChange(items);
    }
    return () => debouncedOnChange.cancel();
  }, [items, debouncedOnChange, activeId]);

  // Clear cache when items change
  useEffect(() => {
    itemCache.current.clear();
  }, [items]);

  // Find an item by ID in the nested structure with caching
  const findItemByIdCached = useCallback((items, id, path = [], parentItems = null) => {
    return findItemById(items, id, path, parentItems, itemCache.current);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      setActiveId(active.id);

      // Find the active item
      const result = findItemByIdCached(items, active.id);
      if (result) {
        setActiveItem(result.item);
      }
    },
    [items, findItemByIdCached],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;

      setActiveId(null);
      setActiveItem(null);

      if (!over) return;

      if (active.id !== over.id) {
        setItems((prevItems) => {
          // Find the items
          const activeResult = findItemByIdCached(prevItems, active.id);
          const overResult = findItemByIdCached(prevItems, over.id);

          if (!activeResult || !overResult) return prevItems;

          // Check if they're in the same container
          const activeParentPath = activeResult.path.slice(0, -1);
          const overParentPath = overResult.path.slice(0, -1);

          const sameContainer =
            activeParentPath.length === overParentPath.length &&
            activeParentPath.every((value, index) => value === overParentPath[index]);

          if (sameContainer) {
            // Get the indices
            const oldIndex = activeResult.path[activeResult.path.length - 1];
            const newIndex = overResult.path[overResult.path.length - 1];

            // Create a new array with the items reordered - use structuredClone for better performance
            const newItems = structuredClone(prevItems);

            // Get the container in the new items
            let newContainer;
            if (activeParentPath.length === 0) {
              newContainer = newItems;
            } else {
              newContainer = getItemAtPath(newItems, activeParentPath);
            }

            // Reorder the items
            const reorderedItems = [...newContainer];
            const [removed] = reorderedItems.splice(oldIndex, 1);
            reorderedItems.splice(newIndex, 0, removed);

            // Update the container
            if (activeParentPath.length === 0) {
              return reorderedItems;
            } else {
              let current = newItems;
              for (let i = 0; i < activeParentPath.length - 1; i++) {
                if (typeof activeParentPath[i] === "number") {
                  current = current[activeParentPath[i]];
                } else if (activeParentPath[i] === "items") {
                  current = current.items;
                }
              }

              if (activeParentPath[activeParentPath.length - 1] === "items") {
                current.items = reorderedItems;
              } else {
                current[activeParentPath[activeParentPath.length - 1]] = reorderedItems;
              }

              return newItems;
            }
          }

          return prevItems;
        });
      }
    },
    [findItemByIdCached],
  );

  // Add a new top-level item
  const handleAddItem = useCallback(() => {
    setItems((prevItems) => [
      ...prevItems,
      {
        id: generateId(),
        label: "New Item",
        link: "",
        items: [],
      },
    ]);
  }, []);

  // Remove an item by ID
  const handleRemoveItem = useCallback(
    (item) => {
      // If onDeleteItem prop is provided, call it with the item
      if (onDeleteItem && typeof onDeleteItem === "function") {
        // Cancel any pending debounced onChange calls
        debouncedOnChange.cancel();
        onDeleteItem(item);
        return;
      }

      // Original deletion logic (fallback if onDeleteItem is not provided)
      const id = item.id;
      setItems((prevItems) => {
        const result = findItemByIdCached(prevItems, id);
        if (!result) return prevItems;

        const { path } = result;
        // Use structuredClone instead of JSON.parse/stringify
        const newItems = structuredClone(prevItems);

        // Navigate to the parent array
        let current = newItems;
        for (let i = 0; i < path.length - 1; i++) {
          if (typeof path[i] === "number") {
            current = current[path[i]];
          } else if (path[i] === "items") {
            current = current.items;
          }
        }

        // Remove the item
        if (Array.isArray(current)) {
          current.splice(path[path.length - 1], 1);
        }

        return newItems;
      });

      // Also remove from expanded items if it was expanded
      setExpandedItems((prev) => prev.filter((itemId) => itemId !== id));
    },
    [findItemByIdCached, onDeleteItem, debouncedOnChange],
  );

  // Edit an item by ID
  const handleEditItem = useCallback(
    (id, updatedData) => {
      setItems((prevItems) => {
        const result = findItemByIdCached(prevItems, id);
        if (!result) return prevItems;

        const { path } = result;
        // Use structuredClone instead of JSON.parse/stringify
        const newItems = structuredClone(prevItems);

        // Navigate to the item using the utility function
        const parentPath = path.slice(0, -1);
        const current = parentPath.length === 0 ? newItems : getItemAtPath(newItems, parentPath);

        // Update the item
        if (Array.isArray(current)) {
          const index = path[path.length - 1];
          current[index] = { ...current[index], ...updatedData };
        }

        return newItems;
      });
    },
    [findItemByIdCached],
  );

  // Add a child item to a parent
  const handleAddChildItem = useCallback(
    (parentId) => {
      setItems((prevItems) => {
        const result = findItemByIdCached(prevItems, parentId);
        if (!result) return prevItems;

        const { path } = result;
        // Use structuredClone instead of JSON.parse/stringify
        const newItems = structuredClone(prevItems);

        // Navigate to the parent item using the utility function
        const parentPath = path.slice(0, -1);
        const current = parentPath.length === 0 ? newItems : getItemAtPath(newItems, parentPath);

        // Get the parent item
        const parentItem = current[path[path.length - 1]];

        // Ensure it has an items array
        if (!parentItem.items) {
          parentItem.items = [];
        }

        // Add the new child
        parentItem.items.push({
          id: generateId(),
          label: "New Child",
          link: "",
          items: [],
        });

        return newItems;
      });

      // Expand the parent
      setExpandedItems((prev) => {
        if (!prev.includes(parentId)) {
          return [...prev, parentId];
        }
        return prev;
      });
    },
    [findItemByIdCached],
  );

  // Toggle expanded state for an item
  const handleToggleExpand = useCallback((id) => {
    setExpandedItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // Handle dropdown open/close
  const handleDropdownOpen = useCallback((dropdownId, isOpen) => {
    setOpenDropdownId(isOpen ? dropdownId : null);
  }, []);

  // Function to collect all expandable item IDs (items that have children)
  const getAllExpandableIds = useCallback((menuItems) => {
    const expandableIds = [];

    const traverse = (items) => {
      if (!items || !Array.isArray(items)) return;

      items.forEach((item) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          expandableIds.push(item.id);
          traverse(item.items); // Recursively check nested items
        }
      });
    };

    traverse(menuItems);
    return expandableIds;
  }, []);

  // Expand all items
  const handleExpandAll = useCallback(() => {
    const allExpandableIds = getAllExpandableIds(items);
    setExpandedItems(allExpandableIds);
  }, [items, getAllExpandableIds]);

  // Collapse all items
  const handleCollapseAll = useCallback(() => {
    setExpandedItems([]);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <div className="menu-editor">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium">Menu Structure</h3>
            {/* Show expand/collapse controls when there are 3+ expandable items total */}
            {(() => {
              const totalExpandableItems = getAllExpandableIds(items);

              if (totalExpandableItems.length >= 3) {
                return (
                  <div className="flex gap-3 text-sm">
                    <button onClick={handleExpandAll} className="text-blue-600 hover:text-blue-800 underline">
                      Expand all
                    </button>
                    <button onClick={handleCollapseAll} className="text-blue-600 hover:text-blue-800 underline">
                      Collapse all
                    </button>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <Button onClick={handleAddItem} variant="primary" size="sm" icon={<Plus size={16} />}>
            Add Item
          </Button>
        </div>

        <SortableList
          items={items}
          onRemove={handleRemoveItem}
          onEdit={handleEditItem}
          onAddChild={handleAddChildItem}
          onToggle={handleToggleExpand}
          expandedItems={expandedItems}
          activeId={activeId}
          pages={pages}
          openDropdownId={openDropdownId}
          onDropdownOpen={handleDropdownOpen}
        />

        {items.length === 0 && (
          <div className="h-20 border-2 border-dashed rounded-md mb-2 flex items-center justify-center border-slate-300 bg-slate-50">
            <p className="text-slate-500 text-sm">
              No menu items yet. Click &quot;Add Item&quot; to create your first menu item.
            </p>
          </div>
        )}

        <DragOverlay>{activeId ? <DragOverlayComponent activeItem={activeItem} /> : null}</DragOverlay>
      </div>
    </DndContext>
  );
}

export default MenuEditor;
