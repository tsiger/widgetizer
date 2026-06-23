# QA-011 — Editor Save remains enabled after Undo restores visible widget state

| Field | Value |
| --- | --- |
| Story IDs | `EDIT-024`, `EDIT-042`, `EDIT-043`, `SAFE-018` |
| Severity | Low |
| Environment | Web app dev mode; Vite on `localhost:3000`, Express on `localhost:3001`; `experimentation` at `c7dff686` |
| Preconditions | Active disposable project `QA Media Regression 2026-06-22`; page editor open at `/page-editor?pageId=new-clients`; **Image + Text** widget selected |
| Status | Confirmed |
| Reproducibility | Reproduced on two widget-control combinations in the inspected web dev environment |
| Data impact | Users may be told there are unsaved changes after undoing visible edits back to the original state |

## Minimal reproduction

1. Open `/page-editor?pageId=new-clients`.
2. Select the **Image + Text** widget.
3. Click **Remove image**.
4. Change **Image position** from **End** to **Start**.
5. Click **Undo** twice.

## Expected

The original image and **Image position: End** should be restored, Undo should be disabled, Redo may remain enabled, and Save should return to disabled because the current visible widget state matches the original saved state.

## Actual

The visible widget state was restored and Undo became disabled, but Save remained enabled.

## Evidence

- After two undo actions, the image preview again showed the original color-consult image and **Image position** showed **End** selected.
- The toolbar state was `Undo (Ctrl+Z)` disabled, `Redo (Ctrl+Shift+Z)` enabled, and `Save` still enabled.
- Saving the restored state and reloading preserved the original image and **Image position: End**, then Save returned to disabled.
- The same dirty-state behavior reproduced on `/page-editor?pageId=services` with **Icon Card Grid**: changing **Desktop columns** from `4` to `3`, toggling **Uppercase** off, then undoing both restored `Desktop columns: 4` and `Uppercase` checked, but Save stayed enabled while Undo was disabled.
