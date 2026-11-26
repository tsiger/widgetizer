# Embedding the public packages

[Map](../README.md) · [Package contracts](../../core-packages.md)

## Plain-language guide

An app can reuse Widgetizer's editor and backend while supplying its own storage and limits. Using a custom handler or publishing loop means that app owns the parts it replaces. OSS tests establish the packaged behaviour; they do not establish another app's deployment or tenant boundaries.

## Technical contract

| Surface | Contract and current boundary |
| --- | --- |
| Custom content writes | Take the exported `withContentWriteLock` from `@widgetizer/builder-server` (never a second serializer) and call `assertIntroducedMediaExists` inside it, along with an in-section language-enabled check, for parity with mounted routes and media deletion. Custom theme-settings and site-identity routes can use `extractMediaPathsFromThemeSettings`, `extractMediaPathsFromSiteIdentity`, `updateThemeSettingsMediaUsage`, `updateSiteIdentityMediaUsage`, and `readSiteIdentity`. |
| Delete cleanup | Only confirmed-deleted targets are scrubbed, inside the content-write section. Incomplete cleanup is reported rather than treated as a clean result. |
| Editor responses | `MEDIA_USAGE_STALE` means saved with stale usage; `MEDIA_REFERENCE_MISSING` rejects a write; `LANGUAGE_REMOVED` stops the stale session; `REFERENCE_CLEANUP_INCOMPLETE` is a successful deletion with incomplete cleanup; `THEME_SETTINGS_CHANGED` / `THEME_VERSION_CHANGED` refuse a theme save made against settings that changed elsewhere, with nothing written. Custom UI must preserve those distinctions. |
| Theme-settings saves | The editor saves theme settings with `PATCH /api/themes/project/:projectId` (changed settings only). A route of its own that saves theme settings reads `theme.json`, merges with `mergeThemeSettingChanges` inside its content-write section, writes, and answers `{ theme, warnings }`. There is no whole-file save to fall back to: a host without that route cannot save theme settings from the editor. A host's own preview routes should build what they render with `previewThemeSettings(storedTheme, postedTheme)` (exported from `@widgetizer/builder-server`), so the settings' structure comes from the stored file and never from the request. |
| Rendering | A custom publishing loop supplies maps limited to published pages/items, resolves theme-setting references, and includes pagination and current-page context. `@widgetizer/builder-server` exports `generateSite` (with optional `formatPages: false`), `selectBuildPages`, `resolveMaxFormsPerSite`, `listAreas`/`readArea`, `loadSiteStrings`, `projectLanguages`, `readCollectionItem`, `stripHtmlToText`, and `injectThemeReads` so hosts share selection, form-ceiling and render logic. `fallback` and `noindex` affect SEO alternates; visitor language navigation is a different consumer. |
| Backup and language seeding | Media metadata comes from the database. An unreadable/incomplete restore is refused. Seeding creates missing content without replacing existing translations and reads required inputs before writes. Exported helpers include `registerPresetMedia` and seed-root resolvers `listSeedThemeIds` / `resolveSeedThemeDir`. |
| Theme updates | Preparation precedes replacement; the version is recorded after a successful apply (`hasInterruptedThemeUpdate` detects an interrupted run). Recovery copies survive an unsuccessful undo. The packaged update holds the content-write section for the whole run. A custom update route built on `applyThemeUpdateToDir` must take the same section, or a theme-settings save can land between its merge and its swap. It should also pass the project's additional language codes as `languages`, so that an update whose collection would publish into a language's folder is refused. |
| Limits | Every content-creating route must enforce the relevant finite allowance. Current item create/duplicate/version paths do; page paths do not enforce `MAX_PAGES_PER_PROJECT`. Media uploads read `MAX_UPLOAD_SIZE_BYTES` (exposed to the editor via `GET /api/limits`) and call optional `reserveStorage(scope, bytes)` on `LimitsAdapter` for total-storage enforcement. OSS returns unbounded count/storage allowances. |
| Process boundary | Content and update coordination is in-process. Deleted-path memory ends on restart. Shared storage alone provides no cross-process ordering. |

These are generic public-package contracts. Private deployment details and integration-test results belong in the embedding application's own documentation.
