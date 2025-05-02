import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BlockItem from "./BlockItem";

export default function SortableBlockItem({ widgetId, blockId, block, blockSchema, isSelected, onBlockSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: blockId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockItem
        widgetId={widgetId}
        blockId={blockId}
        block={block}
        blockSchema={blockSchema}
        isSelected={isSelected}
        isDragging={isDragging}
        onBlockSelect={onBlockSelect}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
}
