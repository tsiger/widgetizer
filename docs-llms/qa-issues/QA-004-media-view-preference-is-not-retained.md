# QA-004 — Media view preference is not retained

| Field | Value |
| --- | --- |
| Story IDs | `MEDIA-009` |
| Severity | Low |
| Environment | Web app; in-app browser; macOS; `experimentation` at `c7dff686` |
| Preconditions | Active project with media files |
| Status | Confirmed |
| Reproducibility | Always |
| Data impact | None |

## Minimal reproduction

1. Open Media; the list view is selected.
2. Switch to Grid View.
3. Reload the page or leave Media and return.

## Expected

The media library returns in Grid View.

## Actual

The library resets to List View. The view buttons also expose no `aria-pressed` state, so the selected view is only communicated through color.

## Evidence

- Grid cards rendered immediately after selecting Grid View.
- After reload, the List View button regained the active pink class and Grid View returned to its inactive gray class.
