# QA-002 — `.DS_Store` is treated as a widget directory

| Field | Value |
| --- | --- |
| Story IDs | `SAFE-004`, `SAFE-019` |
| Severity | Low |
| Environment | Web app; macOS; `experimentation` at `c7dff686` |
| Preconditions | Create a project from the local Arch theme, whose widget tree contains `.DS_Store` files |
| Status | Confirmed |
| Reproducibility | Always while project widgets are enumerated |
| Data impact | None observed; repeated noisy server errors and unnecessary filesystem work |

## Minimal reproduction

1. Create an Arch project.
2. Open Pages or the visual editor so project widgets are enumerated.
3. Inspect the development-server output.

## Expected

Only widget directories are parsed, and hidden metadata files are ignored during theme copy and widget discovery.

## Actual

The server repeatedly tries to open `widgets/.DS_Store/schema.json` and logs `ENOTDIR` errors.

## Evidence

The development server repeatedly logged:

```text
[ProjectController] Failed to parse schema for widget at widgets/.DS_Store: ENOTDIR: not a directory, open '.../widgets/.DS_Store/schema.json'
```

The copied QA project contains `data/projects/qa-web-smoke-2026-06-22/widgets/.DS_Store`, inherited from `themes/arch/widgets/.DS_Store`.

