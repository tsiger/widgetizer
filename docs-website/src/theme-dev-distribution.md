---
description: Package, distribute, and version Widgetizer themes. The partial update system, deleted files, the latest snapshot, and what gets updated in projects.
---

Once your theme works, you'll want to share it and ship improvements over time. Widgetizer packages themes as zip files and supports a **versioned update system** that delivers changes to existing projects without touching the user's content.

# Packaging a Theme

To distribute a theme, zip its folder — including the `updates/` directory if you use the update system:

1. Zip the entire `themes/my-theme/` folder.
2. Share the zip.
3. Users upload it on the **Themes** page; new versions are imported automatically.

The `latest/` folder inside a zip is ignored — it's always rebuilt locally (see below).

# The Update System

Theme updates use a **partial update** (delta) approach. Each version folder under `updates/` contains only the files that changed:

```
themes/my-theme/
├── theme.json              # Base version (e.g. 1.0.0)
├── layout.liquid
├── widgets/
├── updates/
│   ├── 1.1.0/
│   │   ├── theme.json      # Required — version must be "1.1.0"
│   │   └── widgets/
│   │       └── new-widget/ # Only new/changed files
│   ├── 1.2.0/
│   │   ├── theme.json
│   │   └── assets/
│   │       └── base.css    # Only changed assets
│   └── 1.3.0/
│       ├── theme.json
│       └── deleted/        # Files to remove (see below)
│           └── assets/
│               └── old.css
└── latest/                 # Auto-generated snapshot — do not edit
```

### Creating an Update

1. Create a version folder, e.g. `updates/1.1.0/`.
2. Add a `theme.json` whose `version` matches the folder name.
3. Add only the files that changed (new widgets, updated CSS, etc.).
4. Optionally add a `deleted/` folder to remove files (see below).
5. On the **Themes** page, click **Update** on your theme — the system rebuilds the `latest/` snapshot.

### Deleting Files

To remove files or folders from earlier versions, add a `deleted/` folder mirroring the paths to remove:

- **Files** — add an empty file at the path to delete (e.g. `deleted/assets/old.css`).
- **Folders** — add an empty directory to delete the whole folder (e.g. `deleted/widgets/old-widget/`).
- **Path containers** — non-empty directories inside `deleted/` are treated as containers; only their listed contents are removed, not the container itself.

User content (`pages/`, `uploads/`) and additive-only paths (`templates/`, `menus/`) cannot be deleted.

### The `latest/` Folder

`latest/` is generated automatically — **never edit it by hand**. It's built by:

1. Starting from the base theme files (root level).
2. Applying each version folder in semver order.
3. Letting the newest version win for any overlapping file.

Projects read from `latest/` when it exists, so they always get the most up-to-date theme.

### Version Validation

The build is aborted with an error unless:

- Every version folder contains a `theme.json`.
- The `version` in each `theme.json` matches its folder name.
- Versions are valid semver (`x.y.z`).

# What Gets Updated in Projects

When a user applies your update, files are merged into their project as follows:

| Path | Behavior |
| :-- | :-- |
| `layout.liquid` | Replaced |
| `widgets/` | Replaced |
| `assets/` | Replaced |
| `snippets/` | Replaced |
| `locales/` | Replaced |
| `collection-types/` | Replaced (schemas/templates) |
| `screenshot.png` | Replaced |
| `theme.json` | Settings merged — user values preserved, new settings added, removed settings cleaned up |
| `menus/` | New menus added, existing kept |
| `templates/` | New templates added, existing kept |

**Never modified:** the user's `pages/`, `uploads/`, and authored `collections/` item data.

> **Note:** Updates improve an existing theme — they don't switch a project to a different design system. Content stays compatible. From the user's side, see [Themes](themes.html#theme-updates).

# Presets

Presets are named variants of a theme (different colors, fonts, and optionally demo content) chosen at project creation. They live under `presets/` and are covered with the rest of the folder layout in [Theme Structure](theme-dev-structure.html). Presets are not copied into projects — only the chosen preset's settings and templates are applied at creation time.
