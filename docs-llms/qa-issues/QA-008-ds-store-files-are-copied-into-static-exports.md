# QA-008 — `.DS_Store` files are copied into export outputs

| Field | Value |
| --- | --- |
| Story IDs | `PROJ-024`, `EXPORT-001`, `EXPORT-011` |
| Severity | Low |
| Environment | Web app; in-app browser; macOS; `experimentation` at `c7dff686` |
| Preconditions | Active disposable project `QA Media Regression 2026-06-22`; generated project backup and static exports |
| Status | Confirmed |
| Reproducibility | Reproduced in both generated exports |
| Data impact | Unnecessary OS metadata/noise is shipped in project backup ZIPs and static export output |

## Minimal reproduction

1. Generate a project backup or static export for a project whose copied theme assets include macOS `.DS_Store` files.
2. Inspect the generated ZIP or export directory.

## Expected

Export outputs exclude hidden/system metadata files such as `.DS_Store`.

## Actual

The generated project backup and static export include `.DS_Store` files.

## Evidence

- `data/publish/qa-media-regression-2026-06-22-v1/assets/.DS_Store`
- `data/publish/qa-media-regression-2026-06-22-v2/assets/.DS_Store`
- `/tmp/widgetizer-project-backup-qa-media.zip` contained `assets/.DS_Store` and `collection-types/.DS_Store`.
- Source fixture also contains `data/projects/qa-media-regression-2026-06-22/assets/.DS_Store`, indicating the export copies hidden system files through rather than filtering them.
