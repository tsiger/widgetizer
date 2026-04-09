# Roadmap

This file combines the first-release readiness checklist with the post-`v1` backlog.

## Current Position

### Already improved

- Active-project enforcement is now much stronger: project-scoped backend routes use shared resolution/mismatch handling, frontend requests auto-attach the active project ID, and structured `PROJECT_MISMATCH` responses are preserved instead of being flattened away.
- Frontend query modules now share one response/error-handling path, which keeps validation errors, import/upload error payloads, and project-mismatch metadata intact across the app.
- Theme source resolution and theme metadata reads were tightened up with shared helpers plus cache invalidation, reducing repeated filesystem reads in project/theme listing and update-check flows.
- Media usage tracking is now coupled more closely to page persistence, and structural flows such as create, duplicate, import, and theme-update apply trigger refresh paths so usage data is less likely to drift.
- Date formatting now goes through a shared `useFormatDate()` hook in the main list/history surfaces, so components no longer repeat the same app-settings wiring around `formatDate()`.
- Theme settings are now centralized in a dedicated `themeStore` that is the canonical owner of per-project theme data. The Settings page and page editor both read/write through this shared store. The editor keeps a thin proxy snapshot in `pageStore` for undo/redo only. The save flow delegates to `themeStore.saveSettings()` so server-side corrections are handled consistently. Project-switch and load-failure paths clear stale data and invalidate in-flight requests.
- Frontend async protection now has a small shared request-gate primitive, and the export flow uses it instead of one-off stale booleans.
- `getAllProjects()` and `getAllThemes()` now use lightweight cached query wrappers with TTLs, request deduplication, mutation-driven invalidation, and protection against stale in-flight responses repopulating cache after invalidation.
- Recent hardening around project resolution, API error semantics, theme metadata lookups, and media usage persistence reduces the risk that the first Electron release is blocked by architecture alone.

## `v1` Release Gate

### Must verify before release

- Even with the newer active-project protections, verify that project switching cannot show, save, preview, export, or otherwise operate on data from the wrong project.
- Manually test the highest-risk flows while switching projects mid-action: page editor, theme settings, preview, media, export, and any autosave behavior.
- Make sure import/export works on real projects, not just happy-path local test data.
- Verify packaged Electron startup on a clean machine: first launch, data directory creation, default project behavior, and recovery when local app data already exists.
- Test upgrade safety for local users: opening an older local project, importing an older exported project, and preserving data/settings across app version changes.
- Make sure the installer/update path is predictable on the target OSes you plan to support first, especially Windows if that is the primary release target.
- Add a short "known limitations" section to the README if any project-switch edge cases, import caveats, or platform-specific issues still exist.

### Good enough to ship

- Current folder structure and app boundaries are good enough for public release.
- Hybrid storage choice is reasonable and understandable for contributors.
- Theme system is ambitious but coherent enough for others to explore and extend.
- Existing docs and tests are already above the bar for many first open-source desktop releases.
- Localized fixes are acceptable for `v1` as long as behavior is stable and data is safe.
- For a single-user local desktop app, lack of centralized project-switch orchestration is more of a maintainability problem than a release blocker.

## Post-`v1` Roadmap

### `v1.1` direction

- Introduce a proper project-scoped boundary so a project switch remounts or resets project-owned UI more centrally.
- Consolidate project-switch cleanup into a single orchestration layer instead of scattered component/store fixes.
- Expand regression coverage specifically around project switching and stale async completions.
- Consider moving more project-scoped fetching/caching to a stronger central data layer if that still feels painful after release.

### Ordered backlog

1. Build a form-page abstraction around `useFormNavigationGuard()`
Reduce repeated form-page boilerplate such as `skipGuardRef`, dirty-state guards, and shared save/cancel flow handling.

2. Refactor widget/block operations in `src/stores/widgetStore.js`
Extract shared helpers for add/remove/duplicate/reorder flows so widget and block logic stops diverging.

3. Add a higher-level semver/update-status helper
Wrap repeated version comparison logic in a single helper such as `getUpdateStatus(projectVersion, themeVersion)`.

4. Keep slug and ID generation fully disciplined
Continue routing all new slug and identifier creation paths through `generateUniqueSlug()` to avoid regressions.

5. Consider a higher-level list-page pattern for confirmation flows
`useConfirmationModal()` already removed the main duplication, but list pages may still benefit from a more unified delete/action pattern.

6. Prepare for a future TypeScript migration
Define shared response/domain types, tighten object-shape consistency, and keep expanding JSDoc coverage before any TS conversion begins.
