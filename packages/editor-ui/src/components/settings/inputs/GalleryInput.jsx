import { useState, useRef, useEffect, useLayoutEffect } from "react";
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
import ImageInput from "./ImageInput";

/**
 * GalleryInput — the `gallery` setting type: an ordered, repeatable list of image
 * upload paths. The committed value is a plain array of strings
 * (`["/uploads/images/a.jpg", …]`). Composes the existing ImageInput per row (so the
 * media-selector / upload / metadata flow behaves identically to a single `image`),
 * with drag-to-reorder via @dnd-kit. (Image alt/title/caption live on the media
 * record, edited via the metadata drawer — the gallery carries paths only.)
 *
 * Each row carries a stable client-side `uid`. It keys the dnd-kit sortable, the
 * React list, AND the row's hidden file-input id (`${id}-${uid}`): ImageInput
 * binds `id` to a hidden <input type="file">, so N rows must not share one id.
 * `src` can't be the key (blank/duplicated) and the array index can't (changes
 * on reorder), hence the uid.
 *
 * Blank-`src` rows are kept editor-local (so a freshly-added row persists while
 * the user picks an image) but are NEVER committed: `onChange` only ever emits
 * real upload paths. That keeps the stored array free of empty rows and aligned
 * with the backend's src-aware required-field validation.
 */

let uidCounter = 0;
const nextUid = () => `gallery-row-${(uidCounter += 1)}`;

/** Incoming value (array of upload-path strings) → editable rows with stable uids.
 *  Non-string entries are dropped, not coerced — the value shape is string[]. */
function toRows(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((src) => typeof src === "string" && src !== "")
    .map((src) => ({ uid: nextUid(), src }));
}

/** Editable rows → committed value: a string[] of srcs (drops blank rows, keeps order). */
function toValue(rows) {
  return rows.filter((r) => r.src).map((r) => r.src);
}

/** Collision-free signature of a committed string[] value — used only to tell
 *  whether a committed value actually changed. */
function signature(entries) {
  return JSON.stringify(Array.isArray(entries) ? entries : []);
}

function GalleryRow({ row, inputId, onSrcChange, onRemove, compact }) {
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

  // Narrow right sidebar: a vertical card — drag handle + remove on a compact top
  // bar, full-width preview below. The horizontal row (thumbnail + controls beside
  // it) doesn't fit the ~200px panel.
  if (compact) {
    return (
      <div ref={setNodeRef} style={style} className="p-2 bg-slate-50 border border-slate-200 rounded-md">
        <div className="mb-2 flex items-center justify-between">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab flex items-center text-slate-400 hover:text-slate-600"
            aria-label="Reorder image"
          >
            <GripVertical size={16} />
          </div>
          <IconButton type="button" variant="danger" size="sm" onClick={onRemove} title="Remove image">
            <Trash2 size={16} />
          </IconButton>
        </div>

        <ImageInput id={inputId} value={row.src} onChange={onSrcChange} layout="stacked" />
      </div>
    );
  }

  // Wider hosts (theme Settings page, collection editor): the original horizontal row.
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
        aria-label="Reorder image"
      >
        <GripVertical size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <ImageInput id={inputId} value={row.src} onChange={onSrcChange} layout="row" />
      </div>

      <div className="self-stretch w-px bg-slate-200 shrink-0" />

      <div className="flex items-center shrink-0">
        <IconButton type="button" variant="danger" size="sm" onClick={onRemove} title="Remove image">
          <Trash2 size={18} />
        </IconButton>
      </div>
    </div>
  );
}

export default function GalleryInput({ id, value, onChange }) {
  const [rows, setRows] = useState(() => toRows(value));
  const mounted = useRef(false);
  // Set true right before we call onChange, so the resulting value echo is
  // recognised as ours and does NOT rebuild local rows (which would drop an
  // in-progress blank row and regenerate uids mid-edit). Any value change we did
  // not cause — undo/redo, form reset, switching items — is treated as external
  // and rebuilds rows, discarding local-only blank rows. This is reference- and
  // clone-agnostic (react-hook-form's watch may clone), unlike a content
  // signature, which can't tell our echo from a reset to identical content.
  const echoExpected = useRef(false);

  // Compact (vertical-card) layout only inside the page-editor right sidebar.
  // Wider hosts (theme Settings page, collection editor) keep the horizontal row.
  const rootRef = useRef(null);
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompact(!!rootRef.current?.closest(".page-editor-settings"));
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true; // initial rows already derived from value
      return;
    }
    if (echoExpected.current) {
      echoExpected.current = false; // our own emission echoing back — keep local rows
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(toRows(value)); // external change — rebuild, dropping local-only blank rows
  }, [value]);

  // Update local rows; emit only when the committed (blank-src-filtered) value
  // actually changes, so adding a still-srcless row never marks dirty.
  const apply = (nextRows) => {
    const changed = signature(toValue(nextRows)) !== signature(toValue(rows));
    setRows(nextRows);
    if (!changed) return;
    echoExpected.current = true;
    onChange(toValue(nextRows));
  };

  // A freshly-added row is local-only until it gets a src (no commit yet).
  const handleAdd = () => setRows((prev) => [...prev, { uid: nextUid(), src: "" }]);
  const setSrc = (uid, src) => apply(rows.map((r) => (r.uid === uid ? { ...r, src } : r)));
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

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      {rows.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((r) => r.uid)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <GalleryRow
                  key={row.uid}
                  row={row}
                  inputId={`${id}-${row.uid}`}
                  onSrcChange={(src) => setSrc(row.uid, src)}
                  onRemove={() => removeRow(row.uid)}
                  compact={compact}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={handleAdd} className="self-start settings-action-btn">
        <Plus size={16} className="mr-1" />
        Add image
      </Button>
    </div>
  );
}
