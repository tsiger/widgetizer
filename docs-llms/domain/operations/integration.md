# Embedding the public packages

[Map](../README.md) · [Package contracts](../../core-packages.md)

## Plain-language guide

An app can reuse Widgetizer's editor and backend while supplying its own storage and limits. Using a custom handler or publishing loop means that app owns the parts it replaces. OSS tests establish the packaged behaviour; they do not establish another app's deployment or tenant boundaries.

## Technical contract

| Surface | Contract and current boundary |
| --- | --- |
| Custom content writes | Shared per-project coordination, missing-media validation and an in-section language-enabled check are required for the corresponding packaged guarantees. Independent locks do not coordinate with packaged deletion. |
| Delete cleanup | Only confirmed-deleted targets are scrubbed, inside the content-write section. Incomplete cleanup is reported rather than treated as a clean result. |
| Editor responses | `MEDIA_USAGE_STALE` means saved with stale usage; `MEDIA_REFERENCE_MISSING` rejects a write; `LANGUAGE_REMOVED` stops the stale session; `REFERENCE_CLEANUP_INCOMPLETE` is a successful deletion with incomplete cleanup; `THEME_SETTINGS_CHANGED` / `THEME_VERSION_CHANGED` refuse a theme save made against settings that changed elsewhere, with nothing written. Custom UI must preserve those distinctions. |
| Theme-settings saves | The editor saves theme settings with `PATCH /api/themes/project/:projectId` (changed settings only). A route of its own that saves theme settings reads `theme.json`, merges with `mergeThemeSettingChanges` inside its content-write section, writes, and answers `{ theme, warnings }`. Until it does, the editor falls back to the whole-file `POST` on a 404 that carries no error code. Against the packaged server (for example when only a proxy blocks `PATCH`), that `POST` still refuses a file from an older theme version, so a stale screen cannot revert an update; what is lost is the merge of different settings changed on different screens. A route of its own that writes the whole file without that version check keeps the full exposure. |
| Rendering | A custom publishing loop supplies maps limited to published pages/items, resolves theme-setting references, and includes pagination and current-page context. `fallback` and `noindex` affect SEO alternates; visitor language navigation is a different consumer. |
| Backup and language seeding | Media metadata comes from the database. An unreadable/incomplete restore is refused. Seeding creates missing content without replacing existing translations and reads required inputs before writes. |
| Theme updates | Preparation precedes replacement; the version is recorded after a successful apply. Recovery copies survive an unsuccessful undo. The packaged update holds the content-write section for the whole run; a custom update route built on `applyThemeUpdateToDir` must take the same section, or a theme-settings save can land between its merge and its swap. |
| Limits | Every content-creating route must enforce the relevant finite allowance. Current item create/duplicate/version paths do; page paths do not enforce `MAX_PAGES_PER_PROJECT`. OSS returns unbounded count allowances. |
| Process boundary | Content and update coordination is in-process. Deleted-path memory ends on restart. Shared storage alone provides no cross-process ordering. |

These are generic public-package contracts. Private deployment details and integration-test results belong in the embedding application's own documentation.
