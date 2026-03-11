import { memo } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

// SortableList component - flat renderer with single SortableContext
const SortableList = memo(function SortableList({
  flattenedItems,
  sortableIds,
  onRemove,
  onEdit,
  onAddChild,
  onToggle,
  expandedItems,
  activeId,
  pages,
  openDropdownId,
  onDropdownOpen,
  projection,
}) {
  return (
    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
      <div>
        {flattenedItems.map((flatItem) => {
          const showIndicator = projection?.indicatorId === flatItem.id && activeId !== null;
          return (
            <SortableItem
              key={flatItem.id}
              id={flatItem.id}
              item={flatItem.item}
              depth={flatItem.depth}
              onRemove={onRemove}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onToggle={onToggle}
              expandedItems={expandedItems}
              pages={pages}
              openDropdownId={openDropdownId}
              onDropdownOpen={onDropdownOpen}
              projectedDepth={showIndicator ? projection.depth : null}
              indicatorPosition={showIndicator ? projection.indicatorPosition : null}
            />
          );
        })}
      </div>
    </SortableContext>
  );
});

export default SortableList;
