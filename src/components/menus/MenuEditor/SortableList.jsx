import { useMemo, memo } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

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
  pages,
  openDropdownId,
  onDropdownOpen,
}) {
  // Memoize ids array
  const ids = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className={depth > 0 ? "pl-5 pt-2" : ""}>
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
            pages={pages}
            openDropdownId={openDropdownId}
            onDropdownOpen={onDropdownOpen}
          />
        ))}
      </div>
    </SortableContext>
  );
});

export default SortableList;
