import { useCallback, useMemo, memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { ChevronRight, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { IconButton } from "../../ui/Button";
import Tooltip from "../../ui/Tooltip";
import MenuCombobox from "./MenuCombobox";
import SortableList from "./SortableList";

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
  pages,
  openDropdownId,
  onDropdownOpen,
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
      zIndex: isDragging ? 1000 : 1,
    }),
    [transform, transition, isDragging],
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
    [onEdit, item],
  );

  const handleLinkChange = useCallback(
    (value) => {
      // Accept whatever the user types. If they choose a page option, its value already contains .html.
      onEdit(item.id, { ...item, link: value });
    },
    [onEdit, item],
  );

  // Get background color based on depth for visual hierarchy
  const getBackgroundColor = useMemo(() => {
    switch (depth) {
      case 0:
        return "bg-slate-200"; // Level 1: Dark gray - clearly visible
      case 1:
        return "bg-slate-100"; // Level 2: Medium gray
      case 2:
        return "bg-slate-50"; // Level 3: Light gray
      default:
        return "bg-white";
    }
  }, [depth]);

  const getHoverBackgroundColor = useMemo(() => {
    switch (depth) {
      case 0:
        return "hover:bg-slate-300"; // Level 1: Even darker on hover
      case 1:
        return "hover:bg-slate-200"; // Level 2: Darker gray on hover
      case 2:
        return "hover:bg-slate-100"; // Level 3: Medium gray on hover
      default:
        return "hover:bg-slate-50";
    }
  }, [depth]);

  // Check if this item or any child has an open dropdown
  const hasActiveDropdown = useMemo(() => {
    if (openDropdownId === item.id) return true;

    // Check if any child has the open dropdown
    const hasChildDropdown = (items) => {
      if (!items) return false;
      for (const childItem of items) {
        if (openDropdownId === childItem.id) return true;
        if (hasChildDropdown(childItem.items)) return true;
      }
      return false;
    };

    return hasChildDropdown(item.items || []);
  }, [openDropdownId, item.id, item.items]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 ${isDragging ? "z-50" : ""} ${hasActiveDropdown ? "!z-[99999] relative" : ""}`}
    >
      <div
        className={`group flex items-center p-3 gap-3 border border-slate-200 rounded-md transition-colors ${getBackgroundColor} ${getHoverBackgroundColor} hover:border-slate-300`}
      >
        {/* Left section: Drag handle and expand/collapse */}
        <div className="flex items-center gap-1">
          <div {...attributes} {...listeners} className="cursor-grab p-1 text-slate-400 hover:text-slate-600">
            <GripVertical size={18} />
          </div>

          {item.items && item.items.length > 0 && (
            <Tooltip content={isExpanded ? "Collapse" : "Expand"}>
              <IconButton onClick={handleToggleClick} onMouseDown={handleInputMouseDown} variant="neutral" size="sm">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </IconButton>
            </Tooltip>
          )}
        </div>

        {/* Center section: Inputs */}
        <div className="flex-1 flex items-center gap-3">
          <input
            type="text"
            value={item.label || ""}
            onChange={handleLabelChange}
            onMouseDown={handleInputMouseDown}
            onClick={(e) => e.stopPropagation()}
            className="form-input flex-1"
            placeholder="Menu item label"
          />

          <div className="w-64" onMouseDown={handleInputMouseDown} onClick={(e) => e.stopPropagation()}>
            <MenuCombobox
              options={pages}
              value={item.link || ""}
              onChange={handleLinkChange}
              placeholder="Select page or type URL..."
              isOpen={openDropdownId === item.id}
              onOpenChange={(isOpen) => onDropdownOpen(item.id, isOpen)}
            />
          </div>
        </div>

        {/* Right section: Action buttons (hidden until hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {depth < 2 && (
            <Tooltip content="Add child item">
              <IconButton onClick={handleAddChildClick} onMouseDown={handleInputMouseDown} variant="primary" size="sm">
                <Plus size={18} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip content="Delete item">
            <IconButton onClick={handleRemoveClick} onMouseDown={handleInputMouseDown} variant="danger" size="sm">
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        </div>
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
          pages={pages}
          openDropdownId={openDropdownId}
          onDropdownOpen={onDropdownOpen}
        />
      )}
    </div>
  );
});

export default SortableItem;
