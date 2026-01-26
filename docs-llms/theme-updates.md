## Theme Updates (Planned)

This document describes the planned theme update system that will be implemented next. It is a **design and workflow specification**, not a completed implementation.

### Goals

- Allow projects to **opt in** to receive theme updates.
- Keep multiple theme versions available and selectable.
- Avoid overwriting user-edited files.
- Keep the update workflow simple for theme authors.

### Core Concept: Full Snapshot Updates

Each update release is a **full theme snapshot**, not a patch. This keeps authoring simple and avoids complex diff/merge rules.

Proposed theme layout:

```
themes/
  arch/
    base/            # optional initial version (full)
    updates/
      1.0.0/         # full snapshot
      1.1.0/         # full snapshot
      1.2.0/         # full snapshot
      1.3.0/         # full snapshot
    latest/          # materialized snapshot (built by system)
```

### "Latest" Build (Materialized Snapshot)

Whenever a new update is uploaded:

1. Start from `base/` (or the first update snapshot).
2. Apply update snapshots in version order.
3. Write the composed result to `latest/`.

Notes:
- If a file changes in multiple updates, the **last version wins**.
- The `latest/` folder is always a **ready-to-use** full snapshot.
- Projects that opt in to updates can update directly from `latest/`.

### Update Eligibility

We only apply updates to **theme files**, never to user content.

Never update:
- `pages/`
- `menus/`
- `uploads/`
- `collections/` (if present)

Updatable theme areas (copied into project at creation):
- `layout.liquid`
- `assets/`
- `widgets/`
- `snippets/`
- `templates/`
- `theme.json` (schema updates only)

### Theme Settings Rules

`theme.json` stores user values after editing. Updates must:

- **Add new settings** when they appear in newer versions.
- **Never overwrite existing values**.
- Ignore removals or renames (theme author responsibility).

### Project Metadata

Each project will store:

- `themeName` (from `theme.json.name`)
- `themeVersion` (installed version)
- `receiveThemeUpdates` (boolean)

Optional:
- `lastThemeUpdateAt`
- `lastThemeUpdateVersion`

### Update Workflow

1. Project created with version `x.y.z`.
2. New theme versions uploaded.
3. System builds `latest/`.
4. Projects with `receiveThemeUpdates = true` can apply update.
5. Project theme version is set to latest.

### UI/UX Requirements

**Projects**
- Show badge if `receiveThemeUpdates` is enabled.
- Show "Update" action if a newer version exists.

**Project Creation**
- Theme selector shows name + version.
- "Receive theme updates" toggle (default off).

**Themes Page**
- Group by theme name.
- List available versions.
- Highlight latest.

### API Requirements (Planned)

- `GET /api/themes` should return all versions grouped by name.
- `PUT /api/projects/:id/theme-updates` toggle updates.
- `POST /api/projects/:id/theme-updates/apply` apply latest.

### Version Rules

- Use SemVer (`x.y.z`).
- Compare versions numerically, not lexicographically.

### Open Questions

- Should `latest/` always be written on upload, or built on demand?
- Do we keep the `base/` folder, or treat the first update as base?
- Do we allow skipping update application across multiple versions?

