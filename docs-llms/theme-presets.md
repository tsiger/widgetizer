# Theme Presets

> **Status: Implemented** — Conceptual overview. For the on-disk file shapes see [theme-preset-file-format.md](theme-preset-file-format.md); for how a preset is applied at project creation see [core-projects.md](core-projects.md); for authoring workflow see [theme-preset-process.md](theme-preset-process.md).

## What presets are

Each theme ships shared infrastructure (layout, widgets, assets, snippets, locales) plus a single set of demo content and default settings. **Presets** are named variants of one theme that override **settings** (colors, fonts, style toggles) and/or **demo content** (templates, menus, global widgets) without forking the theme. Authors get many showcase looks from one codebase; users pick a preset when creating a project.

A preset is a directory under `themes/<theme>/presets/<id>/` plus an entry in the theme's `presets/presets.json` registry. The Arch reference theme uses presets heavily — `themes/arch/presets/presets.json` lists 30+ industry variants (bakery, law firm, yoga studio, etc.).

## The model

### Registry — `presets/presets.json`

A `default` field (which preset is pre-selected in the UI) plus a `presets` array of `{ id, name, description }` entries (optionally `liveDemo`). The default preset falls through to the theme root, so it needs no `presets/<id>/` directory. See [theme-preset-file-format.md](theme-preset-file-format.md) for the full shape.

### Per-preset overrides — `preset.json`

A flat `setting_id → value` map under a `settings` key. At creation time these values overwrite the `default` field of matching settings in the project's copied `theme.json`; the schema itself stays in the base `theme.json`. Overrides cover both visual tokens (colors, fonts) and style toggles (corner style, spacing density) that drive body classes through the CSS design system — see [arch-design-system.md](arch-design-system.md).

### Fallback chain

For any preset, resolution falls back to the theme root when the preset omits a dimension:

- **Templates**: `presets/<id>/templates/` → root `templates/`
- **Menus**: `presets/<id>/menus/` → root `menus/`
- **Settings**: `presets/<id>/preset.json` overrides → `theme.json` defaults
- **Collections**: `presets/<id>/collections/` (item data only — schemas stay theme-only) → none
- **Media**: `presets/<id>/media/` (starter image binaries + `manifest.json`) → none
- **Screenshot**: `presets/<id>/screenshot.png` → root `screenshot.png`

Themes with no `presets/` directory behave exactly as before — presets are fully opt-in, and the `preset` param defaults to none.

## Where it lives in code

- **Resolution + registry**: `resolvePresetPaths(themeId, presetId)` and `listThemePresets` / `getThemePresets` in `packages/builder-server/src/controllers/themeController.js`. Preset path helpers (`getThemePresetsDir`, `getThemePresetDir`) are in `packages/builder-server/src/config.js`. Resolution reads from the theme **source** dir (`latest/` if present, root otherwise) so presets delivered via theme updates are visible.
- **Route**: `GET /:id/presets` in `packages/builder-server/src/routes/themes.js`; `getAllThemes` includes a `presets` count per theme.
- **Creation flow**: `scaffoldProjectContent` in `packages/builder-server/src/utils/projectScaffold.js` applies preset menus, template-derived pages, and the settings overrides; `seedPresetCollections` / `seedPresetMedia` in `packages/builder-server/src/controllers/projectController.js` seed collection item data and starter media. See [core-projects.md](core-projects.md) for the full sequence.
- **Frontend**: `getThemePresets` / `getPresetScreenshotUrl` in `packages/editor-ui/src/queries/themeManager.js`, consumed by the project-creation card grid in `app/src/components/projects/ProjectForm.jsx`.

## Lifecycle notes

- **Creation-time only**: presets are consumed once, at project creation. Afterward the project is independent — preset edits don't propagate. The `copyThemeToProject` flow excludes `presets/` (alongside `updates/` and `latest/`) so preset data never lands in a project.
- **Screenshots**: served from the themes directory via `/themes/*`, so `presets/<id>/screenshot.png` resolves automatically.
- **Theme updates**: handled by the version system, which refreshes shared infrastructure and merges `theme.json` without clobbering project content — see [theme-updates.md](theme-updates.md).
