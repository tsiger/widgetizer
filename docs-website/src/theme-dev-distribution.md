---
description: Package, distribute, and version Widgetizer themes. The partial update system, deleted files, the latest snapshot, and what gets updated in projects.
---

Once your theme works, you'll want to share it and ship improvements over time. Widgetizer packages themes as zip files and supports a **versioned update system** that delivers changes to existing projects without touching the user's content.

# Packaging a Theme

To distribute a theme, zip its folder, including the `updates/` directory if you use the update system:

1. Run the theme checker from a Widgetizer source checkout and fix its errors: `npm run validate:theme -- themes/my-theme`. It also checks your update folders' manifests and versions.
2. Zip the entire `themes/my-theme/` folder.
3. Share the zip.
4. Users upload it on the **Themes** page; new versions are imported automatically.

The `latest/` folder inside a zip is ignored; it's always rebuilt locally (see below).

The checker is static. Before you ship an update, also try it the way users will: start from a project made with the previous version, change a setting, a page and a menu, apply the update, and check that their work survived and the new parts arrived.

> **Leave the base `theme.json` version alone.** Your first release sets it — say `1.0.0` — and
> every later zip keeps that same base version, adding the new release as a folder under
> `updates/`. The base is the floor your updates build on, not a running version number.
> Bumping it is the one mistake that breaks existing users: the importer requires the zip's
> base version to match the base they already have, and rejects the upload otherwise. A fresh
> install of that same zip still ends up on your newest version, because the update folders
> are applied during installation.

# The Update System

Theme updates use a **partial update** (delta) approach. Each version folder under `updates/` contains only the files that changed:

```
themes/my-theme/
├── theme.json              # Base version (e.g. 1.0.0)
├── layout.liquid
├── widgets/
├── updates/
│   ├── 1.1.0/
│   │   ├── theme.json      # Required: version must be "1.1.0"
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
└── latest/                 # Auto-generated snapshot (do not edit)
```

### Creating an Update

1. Create a version folder, e.g. `updates/1.1.0/`.
2. Add a `theme.json` whose `version` matches the folder name.
3. Add only the files that changed (new widgets, updated CSS, etc.).
4. Optionally add a `deleted/` folder to remove files (see below).
5. On the **Themes** page, click **Update** on your theme; the system rebuilds the `latest/` snapshot.

### Deleting Files

To remove files or folders from earlier versions, add a `deleted/` folder mirroring the paths to remove:

- **Files:** add an empty file at the path to delete (e.g. `deleted/assets/old.css`).
- **Folders:** add an empty directory to delete the whole folder (e.g. `deleted/widgets/old-widget/`).
- **Path containers:** non-empty directories inside `deleted/` are treated as containers; only their listed contents are removed, not the container itself.

User content (`pages/`, `uploads/`) and additive-only paths (`templates/`, `menus/`) cannot be deleted.

### The `latest/` Folder

`latest/` is generated automatically in the installed copy of your theme (the app's theme library, never your source folder); **never edit it by hand**. It's built by:

1. Starting from the base theme files (root level).
2. Applying, in semver order, the version folders **newer than the installed base**.
3. Letting the newest version win for any overlapping file.

`latest/` is the source the app uses for two things: creating new projects, and applying an update to an existing project. It is not live code that projects run on. Every project keeps its own copy of the theme from the day it was created, and that copy changes only when the owner applies an update.

Folders at or below the installed base are skipped: they describe changes that base already
contains, so re-applying them would put older files back. If *no* folder is newer than the
base, no `latest/` is built and the base itself is the newest version. With a fixed base, as
described above, that doesn't happen after a fresh install of your zip: its update folders
are newer than the base, so `latest/` is built straight away.

### Version Validation

The build is aborted with an error unless:

- Every version folder contains a `theme.json`.
- The `version` in each `theme.json` matches its folder name.
- Versions are valid semver (`x.y.z`).

An upload onto an already-installed theme is rejected when:

- The zip's base `theme.json` version differs from the installed base version. The message
  names both versions; the fix is to restore your original base version and ship the change
  as a new folder under `updates/`.
- The base matches but the zip adds no version the user doesn't already have — reported as
  already up to date.

Rejections happen before anything is written, so a bad upload never leaves a half-updated
theme behind.

# What Gets Updated in Projects

When a user applies your update, files are merged into their project as follows:

| Path | Behavior |
| :-- | :-- |
| `layout.liquid` | Replaced |
| `widgets/` | Replaced |
| `assets/` | Replaced |
| `snippets/` | Replaced |
| `locales/` | Replaced (this is how new or corrected visitor words reach existing sites) |
| `collection-types/` | Replaced (schemas/templates) |
| `screenshot.png` | Replaced |
| `theme.json` | Settings merged: user values preserved, new settings added, removed settings cleaned up |
| `menus/` | New menus added, existing kept |
| `templates/` | New templates become new pages; existing pages kept |

**Never modified:** the user's `pages/`, `uploads/`, menus and authored `collections/` item data. Presets aren't copied into projects, so preset changes in an update only affect projects created afterwards.

An update is refused before anything changes when it would bring in a collection whose `slugPrefix` equals one of the site's language codes (see [Collections](theme-dev-collections.html#item-addresses)).

# Starter Links and Updates

Links in your starter content can point at pages by slug, such as `"href": "contact.html"` in a template, a menu item or a `theme.json` default. When a project is created, Widgetizer turns each slug link it finds there into a stable reference to that page, so the link follows a rename, works from pages inside folders (another language, a collection item) and is cleared if the page is deleted. A theme update does the same for what it **adds**: links in new pages and new menus, and the `link`/`richtext` defaults a new `theme.json` brings. Existing content is left exactly as it is, including a typed link that happens to name a page the update adds.

That only works for links that are **stored**. A `link` default in a widget's `schema.json` is never connected to a page: it is used as written when a template's widget doesn't set the value, and copied as written into a widget the owner adds in the editor. A bare `contact.html` there can break on pages in folders. Put starter links in the content instead: in the template or preset that adds the widget, as Arch's preset does for its header button:

```json
{
  "type": "header",
  "settings": {
    "ctaButtonLink": { "href": "contact.html", "text": "Get in touch", "target": "_self" }
  }
}
```

Existing projects keep whatever they already have, so fixing a starter link this way helps new projects; an owner with a broken link re-picks it in the editor.

# Developing vs. Shipping

Running from source, `npm run theme:sync -- --theme my-theme` copies your source folder into the app's theme library, and `--project <folder>` also copies it into one project and keeps watching. That is a development shortcut, not an update: it copies your base files as they are (no update folders are applied), it never touches the project's pages or menus, and it overwrites the project's `theme.json`, so that project's saved Site settings go back to your defaults. Test the real path, upload and **Apply update**, before you ship.

> **Note:** Updates improve an existing theme; they don't switch a project to a different design system. Content stays compatible. From the user's side, see [Themes](themes.html#theme-updates).

# Presets

Presets are named variants of a theme (different colors, fonts, and optionally demo content) chosen at project creation. They live under `presets/` and are covered with the rest of the folder layout in [Theme Structure](theme-dev-structure.html). Presets are not copied into projects; only the chosen preset's settings, templates, menus, collection items and starter images are applied at creation time.
