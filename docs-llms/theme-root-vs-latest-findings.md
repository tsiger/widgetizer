# Theme Root vs Latest Findings

> Deferred follow-up. Handle this after the locale architecture is resolved.

## Context

Widgetizer has three theme layers:

1. `themes/<theme>/` — authored seed, committed to git
2. `data/themes/<theme>/` — runtime installed copy
3. `data/themes/<theme>/latest/` — composed runtime snapshot after applying version updates

The runtime helper `getThemeSourceDir(themeId)` already encodes the intended read contract:

- read from `data/themes/<theme>/latest/` when it exists
- otherwise read from `data/themes/<theme>/`

That makes `latest/` the runtime "current installed theme" view.

## What Already Uses `getThemeSourceDir()`

These flows already treat `latest/` as the live runtime source:

- `getAllThemes()`
- `getThemeTemplates()`
- `getThemePresets()`
- `resolvePresetPaths()`
- `copyThemeToProject()`
- `getProjectThemeLocale()`
- theme update checks / apply flow

This is the correct direction if the runtime installed theme is supposed to represent the user's currently available theme version.

## Confirmed Inconsistencies

### 1. `getTheme()` still reads root `theme.json`

`server/controllers/themeController.js`

- `getTheme()` uses `getThemeJsonPath(id)`
- that points at the runtime theme root, not `getThemeSourceDir()`

Impact:

- single-theme reads can disagree with `getAllThemes()`
- when `latest/` exists, theme metadata/version can be stale in endpoints that use `getTheme()`

### 2. `getThemeWidgets()` still reads root `widgets/`

`server/controllers/themeController.js`

- `getThemeWidgets()` uses `getThemeWidgetsDir(id)`
- that reads the runtime theme root widgets, not `latest/widgets/`

Impact:

- theme-level widget inspection can ignore update-delivered widget/schema changes
- theme APIs can disagree with the actual installed snapshot that project creation and updates use

## Docs Mismatch

`docs-llms/core-themes.md` currently says `buildLatestSnapshot()` excludes `presets/` from the snapshot.

That is not true in code:

- the snapshot excludes `updates/` and `latest/`
- `presets/` is included in `latest/`
- tests already cover presets being available from `latest/`

This matters because preset discovery intentionally reads from `getThemeSourceDir()` so presets delivered through updates are visible.

## Why This Matters

If `latest/` is the runtime decision point between authored theme files and project adoption, then theme-level reads should be consistent about what "current installed theme" means.

Otherwise we get split behavior:

- some runtime/theme APIs read the installed snapshot
- other runtime/theme APIs read the older root copy

That creates avoidable confusion around:

- current theme version
- current widget schemas
- preset availability
- what exactly a project will inherit when created or updated

## Current Conclusion

The architecture points toward this rule:

- if an operation needs the current installed runtime theme, it should read via `getThemeSourceDir()`
- if an operation is specifically about seed/runtime-root management internals, it can read the root directly

The main remaining cleanup after locales is to normalize theme-level reads around that rule.

## Deferred Scope

After locales are resolved, revisit:

1. `getTheme()` source selection
2. `getThemeWidgets()` source selection
3. docs describing what `latest/` contains
4. any other theme-level endpoint that should consistently mean "current installed theme"
