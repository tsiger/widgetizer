import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { ChevronRight, ChevronDown, GripVertical, Plus, Trash2, Link } from "lucide-react";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid";

// Generate a unique ID
const generateId = () => `item-${uuidv4()}`;

// Ensure all items have IDs
const ensureIds = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item) => {
    const newItem = { ...item };
    if (!newItem.id) {
      newItem.id = generateId();
    }
    if (newItem.items && Array.isArray(newItem.items) && newItem.items.length > 0) {
      newItem.items = ensureIds(newItem.items);
    } else {
      newItem.items = [];
    }
    return newItem;
  });
};

// Utility function to get an item at a specific path
const getItemAtPath = (items, path) => {
  let current = items;
  for (let i = 0; i < path.length; i++) {
    if (typeof path[i] === "number") {
      current = current[path[i]];
    } else if (path[i] === "items") {
      current = current.items;
    }
  }
  return current;
};

// SortableItem component - memoized
const SortableItem = memo(function SortableItem({
  id,
  item,
  depth = 0,
  onRemove,
  onEdit,
  onAddChild,
  onToggle,
  expandedItems,
  activeId,
}) {
  // Memoize expensive calculations
  const isExpanded = useMemo(() => expandedItems.includes(item.id), [expandedItems, item.id]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  // Memoize style calculation
  const style = useMemo(
    () => ({
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
      opacity: isDragging ? 0.4 : 1,
      position: "relative",
      marginLeft: `${depth * 20}px`,
      zIndex: isDragging ? 1000 : 1,
    }),
    [transform, transition, isDragging, depth],
  );

  // Prevent inputs from triggering drag
  const handleInputMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Memoize event handlers
  const handleRemoveClick = useCallback(
    (e) => {
      e.stopPropagation();
      onRemove(item);
    },
    [onRemove, item],
  );

  const handleToggleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onToggle(item.id);
    },
    [onToggle, item.id],
  );

  const handleAddChildClick = useCallback(
    (e) => {
      e.stopPropagation();
      onAddChild(item.id);
    },
    [onAddChild, item.id],
  );

  const handleLabelChange = useCallback(
    (e) => {
      onEdit(item.id, { ...item, label: e.target.value });
    },
    [onEdit, item.id, item],
  );

  const handleLinkChange = useCallback(
    (e) => {
      onEdit(item.id, { ...item, link: e.target.value });
    },
    [onEdit, item.id, item],
  );

  return (
    <div ref={setNodeRef} style={style} className={`mb-2 ${isDragging ? "z-50" : ""}`}>
      <div className="flex items-center p-3 gap-2 border border-slate-200 rounded-md bg-white">
        <div {...attributes} {...listeners} className="cursor-grab p-1 text-slate-400">
          <GripVertical size={18} />
        </div>

        <input
          type="text"
          value={item.label || ""}
          onChange={handleLabelChange}
          onMouseDown={handleInputMouseDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-grow px-2 py-1 border border-slate-200 rounded"
          placeholder="Menu item label"
        />

        <div className="flex items-center px-2 py-1 border border-slate-200 rounded">
          <Link size={14} className="text-slate-400 mr-1" />
          <input
            type="text"
            value={item.link || ""}
            onChange={handleLinkChange}
            onMouseDown={handleInputMouseDown}
            onClick={(e) => e.stopPropagation()}
            className="w-32 outline-none"
            placeholder="/page-url"
          />
        </div>

        {depth < 2 && (
          <button
            onClick={handleAddChildClick}
            onMouseDown={handleInputMouseDown}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
            title="Add child item"
          >
            <Plus size={18} />
          </button>
        )}

        {item.items && item.items.length > 0 && (
          <button
            onClick={handleToggleClick}
            onMouseDown={handleInputMouseDown}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}

        <button
          onClick={handleRemoveClick}
          onMouseDown={handleInputMouseDown}
          className="p-1 text-red-500 hover:bg-red-50 rounded"
          title="Remove item"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {item.items && item.items.length > 0 && isExpanded && (
        <SortableList
          items={item.items}
          depth={depth + 1}
          onRemove={onRemove}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onToggle={onToggle}
          expandedItems={expandedItems}
          activeId={activeId}
        />
      )}
    </div>
  );
});

// SortableList component - memoized
const SortableList = memo(function SortableList({
  items,
  depth = 0,
  onRemove,
  onEdit,
  onAddChild,
  onToggle,
  expandedItems,
  activeId,
}) {
  // Memoize ids array
  const ids = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className={depth > 0 ? "pl-4 pt-2" : ""}>
        {items.map((item) => (
          <SortableItem
            key={item.id}
            id={item.id}
            item={item}
            depth={depth}
            onRemove={onRemove}
            onEdit={onEdit}
            onAddChild={onAddChild}
            onToggle={onToggle}
            expandedItems={expandedItems}
            activeId={activeId}
          />
        ))}
      </div>
    </SortableContext>
  );
});

// Main MenuEditor component
function MenuEditor({ initialItems = [], onChange, onDeleteItem }) {
  // Ensure all items have IDs
  const [items, setItems] = useState(() => ensureIds(initialItems));
  const [expandedItems, setExpandedItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

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

  // Update items when initialItems change
  useEffect(() => {
    // Only update if initialItems reference has changed
    if (initialItems !== initialItemsRef.current) {
      setItems(ensureIds(initialItems));
      initialItemsRef.current = initialItems;
    }
  }, [initialItems]);

  // Create a debounced version of onChange
  const debouncedOnChange = useCallback(
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
  const findItemById = useCallback((items, id, path = [], parentItems = null) => {
    // Check cache first
    const cacheKey = id;
    if (itemCache.current.has(cacheKey)) {
      return itemCache.current.get(cacheKey);
    }

    if (!items || !Array.isArray(items)) return null;

    for (let i = 0; i < items.length; i++) {
      const currentPath = [...path, i];
      if (items[i].id === id) {
        const result = {
          item: items[i],
          path: currentPath,
          parentItems: parentItems || items,
          parentId: parentItems ? parentItems[0]?.id : null,
        };
        itemCache.current.set(cacheKey, result);
        return result;
      }
      if (items[i].items && Array.isArray(items[i].items) && items[i].items.length > 0) {
        const result = findItemById(items[i].items, id, [...currentPath, "items"], items[i].items);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      setActiveId(active.id);

      // Find the active item
      const result = findItemById(items, active.id);
      if (result) {
        setActiveItem(result.item);
      }
    },
    [items, findItemById],
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
          const activeResult = findItemById(prevItems, active.id);
          const overResult = findItemById(prevItems, over.id);

          if (!activeResult || !overResult) return prevItems;

          // Check if they're in the same container
          const activeParentPath = activeResult.path.slice(0, -1);
          const overParentPath = overResult.path.slice(0, -1);

          const sameContainer =
            activeParentPath.length === overParentPath.length &&
            activeParentPath.every((value, index) => value === overParentPath[index]);

          if (sameContainer) {
            // Get the container
            let container;
            if (activeParentPath.length === 0) {
              container = prevItems;
            } else {
              container = getItemAtPath(prevItems, activeParentPath);
            }

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
            const reorderedItems = arrayMove(newContainer, oldIndex, newIndex);

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
    [findItemById],
  );

  // Add a new top-level item
  const handleAddItem = useCallback(() => {
    setItems((prevItems) => [
      ...prevItems,
      {
        id: generateId(),
        label: "New Item",
        link: "/",
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
        const result = findItemById(prevItems, id);
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
    [findItemById, onDeleteItem, debouncedOnChange],
  );

  // Edit an item by ID
  const handleEditItem = useCallback(
    (id, updatedData) => {
      setItems((prevItems) => {
        const result = findItemById(prevItems, id);
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
    [findItemById],
  );

  // Add a child item to a parent
  const handleAddChildItem = useCallback(
    (parentId) => {
      setItems((prevItems) => {
        const result = findItemById(prevItems, parentId);
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
          link: "/",
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
    [findItemById],
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

  // Render the drag overlay - memoized
  const renderDragOverlay = useCallback(() => {
    if (!activeItem) return null;

    return (
      <div className="flex items-center p-3 gap-2 border border-slate-200 rounded-md bg-white shadow-lg">
        <div className="cursor-grab p-1 text-slate-400">
          <GripVertical size={18} />
        </div>
        <span className="flex-grow px-2 py-1">{activeItem.label || "Item"}</span>
      </div>
    );
  }, [activeItem]);

  // Memoize the add button click handler
  const handleAddButtonClick = useCallback(() => {
    handleAddItem();
  }, [handleAddItem]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <div className="menu-editor p-4 bg-slate-50 rounded-md border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Menu Structure</h3>
          <button
            onClick={handleAddButtonClick}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        <SortableList
          items={items}
          onRemove={handleRemoveItem}
          onEdit={handleEditItem}
          onAddChild={handleAddChildItem}
          onToggle={handleToggleExpand}
          expandedItems={expandedItems}
          activeId={activeId}
        />

        {items.length === 0 && (
          <div className="h-12 border-2 border-dashed rounded-md mb-2 flex items-center justify-center border-slate-200">
            <p className="text-slate-400">No items yet. Click "Add Item" to create one.</p>
          </div>
        )}

        <DragOverlay>{activeId ? renderDragOverlay() : null}</DragOverlay>
      </div>
    </DndContext>
  );
}

export default MenuEditor;
