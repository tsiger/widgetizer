/**
 * Data Table component system
 * A smart component that handles structured data with headers, rows, and empty states.
 * Optionally supports drag-to-reorder rows, opt-in via the `sortable` prop — when
 * off, rendering is identical to the original (plain) table.
 */
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { GripVertical } from "lucide-react";

const ROOT_CLASS = "w-full rounded-lg border border-slate-200 border-collapse bg-white";
const ROW_CLASS = "group border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50 last:border-b-0";
const BODY_CLASS = "[&_td]:text-sm [&_td_*]:text-sm";

/**
 * A sortable <tr> used only when Table is in `sortable` mode. It owns the leading
 * drag-handle cell so the rest of the row stays clickable (links/buttons).
 */
function SortableTableRow({ id, rowClassName = "", children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
  };
  return (
    <tr ref={setNodeRef} style={style} className={`${ROW_CLASS} ${rowClassName}`}>
      <td className={`py-3 px-4 w-8 !pl-4 !pr-1 ${rowClassName}`}>
        <button
          type="button"
          className="cursor-grab text-slate-400 hover:text-slate-700 active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      </td>
      {children}
    </tr>
  );
}

export default function Table({
  headers = [],
  data = [],
  renderRow,
  emptyMessage = "No data available",
  className = "",
  // Opt-in drag-to-reorder. All four below are no-ops unless `sortable` is true,
  // so existing consumers (Pages/Menus/Projects) are unaffected.
  sortable = false,
  getRowId = (item) => item.id,
  onReorder,
  rowClassName = () => "",
  ...props
}) {
  // Hooks must run unconditionally; harmless (and unused) when not sortable.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // A leading drag-handle column is prepended in sortable mode, so the header and
  // the empty-state row span one extra column.
  const columnCount = headers.length + (sortable ? 1 : 0);

  const headerRow = (
    <tr className="bg-slate-50 border-b border-slate-200">
      {sortable && <th className="w-8 py-3 px-4" aria-hidden="true" />}
      {headers.map((header, index) => (
        <th
          key={index}
          className={`text-left py-3 px-4 font-medium text-slate-700 ${
            index === headers.length - 1 ? "text-right" : ""
          }`}
        >
          {header}
        </th>
      ))}
    </tr>
  );

  const emptyRow = (
    <tr>
      <td colSpan={columnCount} className="text-center py-8 text-slate-500">
        {emptyMessage}
      </td>
    </tr>
  );

  // Plain (non-sortable) rendering — behavior-identical to the original component.
  if (!sortable) {
    return (
      <table className={`${ROOT_CLASS} ${className}`} {...props}>
        <thead>{headerRow}</thead>
        <tbody className={BODY_CLASS}>
          {data.length === 0
            ? emptyRow
            : data.map((item, index) => (
                <tr key={getRowId(item) ?? index} className={`${ROW_CLASS} ${rowClassName(item)}`}>
                  {renderRow(item)}
                </tr>
              ))}
        </tbody>
      </table>
    );
  }

  // Sortable rendering. DndContext owns the sensors + drop handling; on drop we
  // hand the caller the reordered data and let it persist + update state.
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = data.findIndex((item) => getRowId(item) === active.id);
    const newIndex = data.findIndex((item) => getRowId(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder?.(arrayMove(data, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <table className={`${ROOT_CLASS} ${className}`} {...props}>
        <thead>{headerRow}</thead>
        {data.length === 0 ? (
          <tbody className={BODY_CLASS}>{emptyRow}</tbody>
        ) : (
          <SortableContext items={data.map(getRowId)} strategy={verticalListSortingStrategy}>
            <tbody className={BODY_CLASS}>
              {data.map((item) => (
                <SortableTableRow key={getRowId(item)} id={getRowId(item)} rowClassName={rowClassName(item)}>
                  {renderRow(item)}
                </SortableTableRow>
              ))}
            </tbody>
          </SortableContext>
        )}
      </table>
    </DndContext>
  );
}

// Keep the building block components for manual table construction if needed
export function TableHead({ className = "", children, ...props }) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = "", children, ...props }) {
  return (
    <tbody className={`[&_td]:text-xs [&_td_*]:text-xs ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = "", children, ...props }) {
  return (
    <tr className={`group ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHeader({ className = "", children, ...props }) {
  return (
    <th className={className} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className = "", children, ...props }) {
  return (
    <td className={`text-xs ${className}`} {...props}>
      {children}
    </td>
  );
}

/**
 * Special table cell for action buttons that appear on hover
 */
export function TableActions({ className = "", children, ...props }) {
  return (
    <td className={`text-end text-xs ${className}`} {...props}>
      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {children}
      </div>
    </td>
  );
}
