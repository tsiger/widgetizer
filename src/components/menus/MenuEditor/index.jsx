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
import { Plus } from "lucide-react";
import { debounce, isEqual } from "lodash";

import Button from "../../ui/Button";
import SortableList from "./SortableList";
import DragOverlayComponent from "./DragOverlay";
import { ensureIds, findItemById, getItemAtPath, generateId } from "./utils/menuUtils";
import {
  flattenTree,
  getProjection,
  getMaxSubtreeDepth,
  applyDrop,
  isDescendant,
  removeActiveFromFlat,
} from "./utils/treeUtils";
import { getAllPages } from "../../../queries/pageManager";

const DRAG_DEPTH_STEP = 32; // horizontal drag needed to change depth

function MenuEditor({ initialItems = [], onChange, onDeleteItem }) {
  // Ensure all items have IDs
  const [items, setItems] = useState(() => ensureIds(initialItems));
  const [expandedItems, setExpandedItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [activeItemDepth, setActiveItemDepth] = useState(0);
  const [activeItemWidth, setActiveItemWidth] = useState(null);
  const [pages, setPages] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Cross-level drag state
  const [projection, setProjection] = useState(null);
  const activeDepthRef = useRef(0);
  const activeSubtreeDepthRef = useRef(0);
  const projectionRef = useRef(null);
  const rafRef = useRef(null);

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

  // Flatten tree for rendering — memoized
  const flattenedItems = useMemo(() => flattenTree(items, expandedItems), [items, expandedItems]);

  const sortableIds = useMemo(() => flattenedItems.map((f) => f.id), [flattenedItems]);

  // Flat list without active item's subtree — for projection calculations
  const flatItemsWithoutActive = useMemo(
    () => (activeId ? removeActiveFromFlat(flattenedItems, activeId) : flattenedItems),
    [flattenedItems, activeId],
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

  // Reset all drag state
  const resetDragState = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setActiveId(null);
    setActiveItem(null);
    setActiveItemDepth(0);
    setActiveItemWidth(null);
    setProjection(null);
    activeDepthRef.current = 0;
    activeSubtreeDepthRef.current = 0;
    projectionRef.current = null;
  }, []);

  const getPointerY = useCallback((event) => {
    const translatedRect = event.active.rect.current.translated;
    if (translatedRect) {
      return translatedRect.top + translatedRect.height / 2;
    }

    const initialRect = event.active.rect.current.initial;
    if (initialRect) {
      return initialRect.top + initialRect.height / 2 + event.delta.y;
    }

    return null;
  }, []);

  const getRowRects = useCallback((itemsForProjection) => {
    if (typeof document === "undefined") {
      return [];
    }

    const rectMap = new Map();
    document.querySelectorAll("[data-menu-sortable-id]").forEach((element) => {
      const id = element.getAttribute("data-menu-sortable-id");
      if (!id) return;

      const rect = element.getBoundingClientRect();
      rectMap.set(id, {
        id,
        top: rect.top,
        bottom: rect.bottom,
        mid: rect.top + rect.height / 2,
      });
    });

    return itemsForProjection.map((item) => rectMap.get(item.id)).filter(Boolean);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      setActiveId(active.id);
      setActiveItemWidth(active.rect.current.initial?.width ?? null);

      const flatItem = flattenedItems.find((f) => f.id === active.id);
      if (flatItem) {
        setActiveItem(flatItem.item);
        setActiveItemDepth(flatItem.depth);
        activeDepthRef.current = flatItem.depth;
        activeSubtreeDepthRef.current = getMaxSubtreeDepth(flatItem.item);
      }
    },
    [flattenedItems],
  );

  // Handle drag move — track projection with rAF throttling
  const handleDragMove = useCallback(
    (event) => {
      const { delta } = event;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const pointerY = getPointerY(event);
        const rowRects = getRowRects(flatItemsWithoutActive);
        if (pointerY === null) {
          projectionRef.current = null;
          setProjection(null);
          return;
        }

        const nextProjection = getProjection(
          flatItemsWithoutActive,
          pointerY,
          delta.x,
          DRAG_DEPTH_STEP,
          activeDepthRef.current,
          activeSubtreeDepthRef.current,
          rowRects,
        );

        if (nextProjection) {
          const prev = projectionRef.current;
          if (
            !prev ||
            prev.depth !== nextProjection.depth ||
            prev.parentId !== nextProjection.parentId ||
            prev.targetIndex !== nextProjection.targetIndex ||
            prev.indicatorId !== nextProjection.indicatorId ||
            prev.indicatorPosition !== nextProjection.indicatorPosition
          ) {
            projectionRef.current = nextProjection;
            setProjection(nextProjection);
          }
        }
      });
    },
    [flatItemsWithoutActive, getPointerY, getRowRects],
  );

  // Handle drag end — apply the drop
  const handleDragEnd = useCallback(
    (event) => {
      const { active, delta } = event;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const currentActiveId = active.id;
      const currentActiveDepth = activeDepthRef.current;
      const currentSubtreeDepth = activeSubtreeDepthRef.current;
      const pointerY = getPointerY(event);
      const rowRects = getRowRects(flatItemsWithoutActive);

      const projection =
        projectionRef.current ||
        (pointerY !== null
          ? getProjection(
              flatItemsWithoutActive,
              pointerY,
              delta.x,
              DRAG_DEPTH_STEP,
              currentActiveDepth,
              currentSubtreeDepth,
              rowRects,
            )
          : null);

      resetDragState();

      if (!projection) return;

      // Prevent dropping into own subtree
      if (isDescendant(items, currentActiveId, projection.parentId)) return;

      setItems((prevItems) => {
        return applyDrop(prevItems, currentActiveId, projection, flatItemsWithoutActive);
      });

      // Auto-expand parent if item was dropped into a collapsed parent
      if (projection.parentId && !expandedItems.includes(projection.parentId)) {
        setExpandedItems((prev) => [...prev, projection.parentId]);
      }
    },
    [expandedItems, flatItemsWithoutActive, getPointerY, getRowRects, items, resetDragState],
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

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
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
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
          flattenedItems={flattenedItems}
          sortableIds={sortableIds}
          onRemove={handleRemoveItem}
          onEdit={handleEditItem}
          onAddChild={handleAddChildItem}
          onToggle={handleToggleExpand}
          expandedItems={expandedItems}
          activeId={activeId}
          pages={pages}
          openDropdownId={openDropdownId}
          onDropdownOpen={handleDropdownOpen}
          projection={projection}
        />

        {items.length === 0 && (
          <div className="h-20 border-2 border-dashed rounded-md mb-2 flex items-center justify-center border-slate-300 bg-slate-50">
            <p className="text-slate-500 text-sm">
              No menu items yet. Click &quot;Add Item&quot; to create your first menu item.
            </p>
          </div>
        )}

        <DragOverlay>
          {activeId ? (
            <DragOverlayComponent
              activeItem={activeItem}
              projectedDepth={projection?.depth ?? activeItemDepth}
              width={activeItemWidth}
            />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default MenuEditor;
