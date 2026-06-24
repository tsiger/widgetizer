# QA-003 — Collection table ignores sorting and row-state props

| Field | Value |
| --- | --- |
| Story IDs | `COLL-017`, `COLL-021`, `COLL-022` |
| Severity | Medium |
| Environment | Web app; in-app browser; macOS; `experimentation` at `c7dff686` |
| Preconditions | Active Arch project with a sortable collection such as Projects or Services |
| Status | Fixed — `97e38324` (finding D2) |
| Reproducibility | Always |
| Data impact | Collection items cannot be reordered through this table; selected-row styling is also omitted |

## Minimal reproduction

1. Open a collection list.
2. Inspect the browser console, then try to reorder a sortable collection.
3. Select a row and inspect its row styling.

## Expected

The shared table consumes `sortable`, `getRowId`, `onReorder`, and `rowClassName`; sortable rows expose working drag controls, filtered lists disable reordering, and selected rows receive their configured class.

## Actual

The table does not implement those props. It spreads them onto the native `<table>` element, so React discards `onReorder`, warns about the other unknown DOM props, renders ordinary rows, and never invokes the collection reorder handler. The configured selected-row class is likewise never applied.

## Evidence

- The browser console reports `Unknown event handler property onReorder`, plus invalid/unknown DOM-property errors for `sortable`, `getRowId`, and `rowClassName` whenever a collection list renders.
- `packages/editor-ui/src/pages/CollectionItems.jsx` passes all four props to the shared table.
- `packages/editor-ui/src/components/ui/Table.jsx` does not destructure or implement them and instead forwards `...props` to `<table>`.

## Resolution

`97e38324` ported master's opt-in dnd-kit `sortable` mode into `Table.jsx`: it now destructures and implements `sortable`, `getRowId`, `onReorder`, and `rowClassName` (a grip-handle column + `DndContext`/`SortableContext`, drag end → `onReorder(arrayMove(...))`), so the four props no longer leak onto `<table>`. Sortable collections reorder via the handle, filtered lists disable reordering, and selected rows receive their class. The non-sortable branch is behavior-identical, so the plain-table consumers are unaffected. Covered by `packages/editor-ui/src/components/ui/__tests__/Table.test.jsx`.
