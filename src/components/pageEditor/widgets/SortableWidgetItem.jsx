import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import WidgetItem from "./WidgetItem";

export default function SortableWidgetItem({
  widgetId,
  widget,
  widgetSchema,
  isSelected,
  isModified,
  onWidgetSelect,
  onDeleteClick,
  onDuplicateClick,
  selectedBlockId,
  onBlockSelect,
  onBlocksReorder,
  onAddBlockClick,
  isBlockSelectorOpen,
  activeWidgetId,
  activeBlockTriggerKey,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Create drag handle props for everything except the action buttons
  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <WidgetItem
        widgetId={widgetId}
        widget={widget}
        widgetSchema={widgetSchema}
        isSelected={isSelected}
        isModified={isModified}
        isDragging={isDragging}
        onWidgetSelect={onWidgetSelect}
        dragHandleProps={dragHandleProps}
        onDeleteClick={onDeleteClick}
        onDuplicateClick={onDuplicateClick}
        selectedBlockId={selectedBlockId}
        onBlockSelect={onBlockSelect}
        onBlocksReorder={onBlocksReorder}
        onAddBlockClick={onAddBlockClick}
        isBlockSelectorOpen={isBlockSelectorOpen}
        activeWidgetId={activeWidgetId}
        activeBlockTriggerKey={activeBlockTriggerKey}
      />
    </div>
  );
}
