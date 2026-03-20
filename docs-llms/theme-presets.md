# Theme Presets Feature

> **Status: ✅ Implemented** — This feature has been fully implemented. The specification below reflects the current working implementation. See also: [Theming Guide — Presets](theming.md), [Core Themes](core-themes.md), [Core Projects](core-projects.md).

## Context

Currently, each Widgetizer theme has a single set of demo content (templates, menus, global widgets) and a single set of default settings (colors, typography). If a theme author wants to showcase different visual styles or different page layouts (e.g., "restaurant site" vs. "agency site" vs. "portfolio"), they must create entirely separate themes — duplicating all widgets, layout, assets, and CSS.

This feature introduces **presets**: named variants of a theme that can override **theme settings** (colors, fonts, etc.) and/or **demo content** (templates, menus, global widgets). The theme codebase (layout, widgets, assets, snippets) stays shared. Users pick a preset when creating a project.

## Design

### Theme directory structure with presets

```
themes/arch/
  theme.json              # Base settings schema (unchanged)
  layout.liquid           # Shared
  screenshot.png          # Root screenshot (also default preset fallback)
  assets/                 # Shared
  snippets/               # Shared
  locales/                # Shared (theme locale i18n files)
  widgets/                # Shared
  templates/              # Default demo content (backward compatible)
  menus/                  # Default menus (backward compatible)
  presets/                # NEW
    presets.json          # Preset registry
    financial/
      preset.json         # Settings overrides (colors, fonts, etc.)
      screenshot.png      # Preset preview
      templates/          # Full page set for this preset
        index.json
        about.json
        services.json
        contact.json
        global/
          header.json
          footer.json
      menus/              # Preset navigation
        main-menu.json
        footer-menu.json
    coaching/
      preset.json         # Settings overrides
      screenshot.png
      templates/          # Full page set
      menus/
```

### presets.json (preset registry)

```json
{
  "default": "default",
  "presets": [
    { "id": "default", "name": "Consulting Firm", "description": "Strategy & operations consulting with a professional, authoritative feel" },
    { "id": "financial", "name": "Financial Advisor", "description": "Wealth management and financial planning with a trustworthy, premium look" },
    { "id": "coaching", "name": "Business Coach", "description": "Executive coaching and leadership development with a warm, approachable tone" },
    { "id": "accounting", "name": "Accounting Firm", "description": "Tax, audit, and advisory services with a clean, precise aesthetic" },
    { "id": "legal", "name": "Law Firm", "description": "Legal services with a dignified, established presence" }
  ]
}
```

- `"default"` field = which preset is pre-selected in UI
- `"default"` preset falls through to root `templates/`, `menus/`, and `theme.json` defaults (no `presets/default/` directory needed)
- All non-default presets include full `templates/`, `menus/`, `preset.json`, and `screenshot.png`
- Themes without `presets/` work exactly as before (zero breaking changes)

### preset.json (per-preset settings overrides)

```json
{
  "settings": {
    "standard_bg_primary": "#fefbf6",
    "standard_accent": "#c4540a",
    "heading_font": { "stack": "\"Playfair Display\", serif", "weight": 700 },
    "corner_style": "rounded",
    "card_style": "shadow",
    "spacing_density": "default",
    "button_shape": "auto"
  }
}
```

Flat map of `setting_id → value`. Applied to the `default` field of matching settings in the project's `theme.json` at creation time. Only specifies what changes — schema stays in base `theme.json`.

Settings can include both visual tokens (colors, fonts) and style settings (shapes, card style, spacing density, etc.). Style settings control body classes that cascade through the CSS design system — see [Theme Design System — Style Classes](theme-design-system.md#style-classes-body-class-pattern).

### Fallback chain

For any preset:
- **Templates**: `presets/{id}/templates/` → root `templates/`
- **Menus**: `presets/{id}/menus/` → root `menus/`
- **Settings**: `presets/{id}/preset.json` overrides → `theme.json` defaults
- **Screenshot**: `presets/{id}/screenshot.png` → root `screenshot.png`

## Files to modify

### 1. `server/controllers/themeController.js`

- **Add `resolvePresetPaths(themeId, presetId)` helper**: Returns `{ templatesDir, menusDir, settingsOverrides }` with fallback logic
- **Add `getThemePresets(req, res)` endpoint**: Reads `presets/presets.json`, returns array of preset objects with `isDefault` flag
- **Modify `copyThemeToProject`**: Add `"presets"` to the `allExcludes` list so preset data is never copied into projects
- **Modify `getAllThemes`**: Add `presetCount` to each theme's response object (read from `presets/presets.json` if it exists)

### 2. `server/controllers/projectController.js`

- **Modify `createProject`**:
  - Accept optional `preset` from request body
  - Call `resolvePresetPaths(theme, preset)` to get resolved templates/menus dirs and settings overrides
  - Use resolved `templatesDir` instead of `getThemeTemplatesDir(theme)` for `processTemplatesRecursive`
  - After theme copy, if preset has custom menus, replace the copied menus with preset menus
  - After theme copy, apply `settingsOverrides` to project's `theme.json` (walk settings groups, update `default` field for matching IDs)
  - Store `preset` in project metadata

### 3. `server/routes/themes.js`

- Add route: `router.get("/:id/presets", themeController.getThemePresets)`

### 4. `server/routes/projects.js`

- Add optional `preset` field to POST validation: `body("preset").optional().isString().trim()`

### 5. `src/components/projects/ProjectForm.jsx`

- When theme selection changes, fetch `GET /api/themes/{themeId}/presets`
- If presets exist, render a visual card grid below the theme dropdown
- Each card shows preset screenshot + name, with selected state (pink border)
- Default preset is pre-selected
- `preset` value included in form data on submit

### 6. `src/queries/projectManager.js` (or new `themeManager.js`)

- Add `getThemePresets(themeId)` fetch function
- Add `getPresetScreenshotUrl(themeId, presetId)` URL helper

## Key implementation details

**Menus handling**: `copyThemeToProject` copies root `menus/` into the project. If a preset has its own `menus/`, the project creation flow must replace the already-copied menus with the preset's menus before the enrichment step. Simplest approach: after `copyThemeToProject`, if preset menus exist, delete project's `menus/` dir and copy preset menus in.

**Settings override application**: After `copyThemeToProject` copies `theme.json`, iterate all settings groups and update `item.default` for items whose `id` matches a key in `settingsOverrides`. This happens once at project creation — after that the project is independent.

**Static file serving**: Screenshots are served from the themes directory via `/themes/*` (backed by `getThemesDir()` in `server/createApp.js`). Preset screenshots at `/themes/arch/presets/financial/screenshot.png` work automatically.

**Theme updates**: Presets are only used at project creation time. Once a project is created, it's independent. Theme updates (`applyThemeUpdate`) modify widgets/layout/assets but never touch project pages/menus. Preset files can be updated via the existing version system (add/modify files in `updates/` version folders).

**Backward compatibility**: Everything is opt-in. No `presets/` directory = no presets = existing behavior unchanged. The `preset` param in `createProject` is optional and defaults to null.

## Verification

1. **Backward compatibility**: Create a project with a theme that has no `presets/` dir — should work identically to current behavior
2. **Settings-only preset**: Create a preset with only `preset.json` + `screenshot.png` — project should get root templates/menus but with overridden color/font defaults in `theme.json`
3. **Full preset**: Create a preset with `templates/`, `menus/`, `preset.json` — project should get preset's pages, menus, and overridden settings
4. **UI**: Select a theme with presets — card grid appears, default is pre-selected, changing preset updates form state
5. **Screenshots**: Each preset card shows its own screenshot, with fallback to root screenshot if missing
6. **Theme updates**: Apply a theme update to a project created from a preset — widgets/layout update correctly, pages/settings remain unchanged
7. Run existing tests: `npm test`
