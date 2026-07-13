import { useState, useRef, useEffect } from "react";
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
import { GripVertical, Plus, Trash2 } from "lucide-react";
import Button, { IconButton } from "../../ui/Button";
import TextInput from "./TextInput";

/**
 * TableInput — the `table` setting type: an ordered list of rows, each with a fixed set of
 * `columns` declared in the schema. v1 columns are all `text`. Mirrors GalleryInput's row model
 * (stable per-row `uid`s for the @dnd-kit sortable + React key, drag-to-reorder, and the
 * commit-on-real-change logic) but renders one cell input per column instead of one image.
 *
 * Blank rows stay editor-local: `onChange` only ever emits rows that have content (some declared
 * cell non-blank after trim), keyed to the declared column ids — matching the backend sanitizer.
 */

let uidCounter = 0;
const nextUid = () => `table-row-${(uidCounter += 1)}`;

const cellOf = (row, colId) => (typeof row?.[colId] === "string" ? row[colId] : "");

const rowHasContent = (values, columns) => columns.some((c) => String(values[c.id] ?? "").trim() !== "");

/** Incoming value (array of row objects) → editable rows with stable uids, declared cols only. */
function toRows(value, columns) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      uid: nextUid(),
      values: Object.fromEntries(columns.map((c) => [c.id, cellOf(row, c.id)])),
    }));
}

/** Editable rows → committed value: row objects keyed by declared column id, blank rows dropped. */
function toValue(rows, columns) {
  return rows
    .filter((r) => rowHasContent(r.values, columns))
    .map((r) => Object.fromEntries(columns.map((c) => [c.id, r.values[c.id] ?? ""])));
}

/** Collision-free signature of a committed value — used only to tell whether it actually changed. */
function signature(entries) {
  return JSON.stringify(Array.isArray(entries) ? entries : []);
}

function TableRow({ row, columns, onCellChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.uid,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-stretch gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 shrink-0 flex items-center text-slate-400 hover:text-slate-600"
        aria-label="Reorder row"
      >
        <GripVertical size={18} />
      </div>

      {/* Two columns sit side by side (e.g. Label / Value); any other count stacks, since
          3+ short inputs in a row get cramped in the settings panel. */}
      <div
        className={
          columns.length === 2 ? "flex-1 min-w-0 grid grid-cols-2 gap-3" : "flex-1 min-w-0 flex flex-col gap-2"
        }
      >
        {columns.map((col) => (
          <label key={col.id} className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-medium text-slate-500">{col.label || col.id}</span>
            <TextInput value={row.values[col.id] ?? ""} onChange={(v) => onCellChange(col.id, v)} />
          </label>
        ))}
      </div>

      <div className="self-stretch w-px bg-slate-200 shrink-0" />

      <div className="flex items-center shrink-0">
        <IconButton type="button" variant="danger" size="sm" onClick={onRemove} title="Remove row">
          <Trash2 size={18} />
        </IconButton>
      </div>
    </div>
  );
}

export default function TableInput({ value, onChange, columns = [] }) {
  const cols = Array.isArray(columns) ? columns : [];
  const [rows, setRows] = useState(() => toRows(value, cols));
  const mounted = useRef(false);
  // See GalleryInput: set true right before we emit, so our own value echo doesn't rebuild local
  // rows (which would drop an in-progress blank row and regenerate uids mid-edit). Any change we
  // didn't cause — undo/redo, switching items — rebuilds rows.
  const echoExpected = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (echoExpected.current) {
      echoExpected.current = false;
      return;
    }
    setRows(toRows(value, cols));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Update local rows; emit only when the committed (blank-row-filtered) value actually changes.
  const apply = (nextRows) => {
    const changed = signature(toValue(nextRows, cols)) !== signature(toValue(rows, cols));
    setRows(nextRows);
    if (!changed) return;
    echoExpected.current = true;
    onChange(toValue(nextRows, cols));
  };

  const emptyValues = () => Object.fromEntries(cols.map((c) => [c.id, ""]));
  const handleAdd = () => setRows((prev) => [...prev, { uid: nextUid(), values: emptyValues() }]);
  const setCell = (uid, colId, v) =>
    apply(rows.map((r) => (r.uid === uid ? { ...r, values: { ...r.values, [colId]: v } } : r)));
  const removeRow = (uid) => apply(rows.filter((r) => r.uid !== uid));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.uid === active.id);
    const newIndex = rows.findIndex((r) => r.uid === over.id);
    if (oldIndex !== -1 && newIndex !== -1) apply(arrayMove(rows, oldIndex, newIndex));
  };

  if (cols.length === 0) {
    return <p className="text-sm text-slate-500">This table has no columns defined.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((r) => r.uid)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <TableRow
                  key={row.uid}
                  row={row}
                  columns={cols}
                  onCellChange={(colId, v) => setCell(row.uid, colId, v)}
                  onRemove={() => removeRow(row.uid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={handleAdd} className="self-start">
        <Plus size={16} className="mr-1" />
        Add row
      </Button>
    </div>
  );
}
