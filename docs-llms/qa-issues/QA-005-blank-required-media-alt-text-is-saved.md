# QA-005 — Blank required media alt text is saved

| Field | Value |
| --- | --- |
| Story IDs | `MEDIA-016`, `MEDIA-017` |
| Severity | High |
| Environment | Web app; in-app browser; macOS; `experimentation` at `c7dff686` |
| Preconditions | Active project containing an image with existing alt text |
| Status | Confirmed |
| Reproducibility | Always |
| Data impact | Image accessibility metadata can be erased despite the field being marked required |

## Minimal reproduction

1. Open Media and choose Edit metadata for an image.
2. Clear `Alt Text (Required)`.
3. Click Save Changes.

## Expected

Save is disabled or a field-level error prevents the blank value from being persisted.

## Actual

Save remains enabled, the drawer closes, and a `Metadata updated successfully` toast appears. Reopening the editor shows the alt field is blank.

## Evidence

- Live test on `shearline-news-holiday-late-nights.webp` in disposable project `QA Media Regression 2026-06-22`.
- The metadata was restored to `QA restored holiday late-night article image` after reproduction.
