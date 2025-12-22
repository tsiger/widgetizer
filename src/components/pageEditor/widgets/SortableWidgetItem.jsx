import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import WidgetItem from "./WidgetItem";

export default function SortableWidgetItem({
  widgetId,
  widget,
  widgetSchema,
  isSelected,
  isModified,
  isDraggingAny,
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
  onHover,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleBlockDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const blockOrder = widget.blocksOrder || [];
      const oldIndex = blockOrder.indexOf(active.id);
      const newIndex = blockOrder.indexOf(over.id);
      const newOrder = [...blockOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id);
      onBlocksReorder(widgetId, newOrder);
    }
  };

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
        isDraggingAny={isDraggingAny}
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
        onBlockDragEnd={handleBlockDragEnd}
        onHover={onHover}
      />
    </div>
  );
}
