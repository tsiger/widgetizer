# Session Handoff — Locale Resolution Fix

> Temporary file. Delete after the continuation session is done.

## Problem
The action-bar widget's image setting showed the raw translation key `global.widgets.settings.image.label` instead of "Background image".

## Root Cause
The API endpoint `getProjectThemeLocale` (in `server/controllers/themeController.js`) reads locale files from `data/themes/arch/locales/en.json` (resolved via `getThemeSourceDir()`), **not** from `data/projects/<name>/locales/en.json`.

We had updated the seed (`themes/arch/locales/en.json`) and the project copies (`data/projects/*/locales/en.json`), but missed the runtime theme copy at `data/themes/arch/locales/en.json`.

## Locale Resolution Path
```
API: GET /api/themes/project/:projectId/locales/:lang
  → getThemeSourceDir(themeId)
    → checks data/themes/<themeId>/latest/theme.json first
    → falls back to data/themes/<themeId>/
  → reads data/themes/<themeId>/locales/<lang>.json
  → merges with core widget locales from src/core/widgets/locales/
```

The `data/projects/<name>/locales/` files are **not used** by this endpoint.

## Fix
Copied `themes/arch/locales/en.json` → `data/themes/arch/locales/en.json`.

**Remember:** When adding new locale keys, update all three places:
1. `themes/arch/locales/en.json` (seed — committed to git)
2. `data/themes/arch/locales/en.json` (runtime theme — what the API reads)
3. `data/projects/*/locales/en.json` (project copies — not used by locale API but kept in sync)
