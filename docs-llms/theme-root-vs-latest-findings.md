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

## Cleanup Result

The previously deferred inconsistencies have now been normalized:

- `getTheme()` reads `theme.json` from `getThemeSourceDir()`
- `getThemeWidgets()` reads widget schemas from `path.join(getThemeSourceDir(), "widgets")`

That means single-theme metadata and theme-level widget inspection now use the same installed snapshot contract as:

- `getAllThemes()`
- `getThemeTemplates()`
- `getThemePresets()`
- `resolvePresetPaths()`
- project creation and theme updates

## Docs Mismatch

`docs-llms/core-themes.md` previously said `buildLatestSnapshot()` excludes `presets/` from the snapshot.

That was not true in code:

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

The architecture now follows this rule consistently:

- if an operation needs the current installed runtime theme, it should read via `getThemeSourceDir()`
- if an operation is specifically about seed/runtime-root management internals, it can read the root directly

Theme-level runtime reads that represent the installed theme now resolve through `getThemeSourceDir()`. Direct runtime-root reads should be reserved for storage/management internals only.

## Remaining Watchpoint

If future theme-level endpoints are added, use the same rule:

1. current installed theme view → `getThemeSourceDir()`
2. runtime-root management internals → direct root helpers if truly needed
