# Temp Roadmap

> Items to address — targeting next session.

---

## 1) `P0` Media-by-ID operations not scoped to project

- **widgetizer**: `getMediaFileById`, `deleteMediaFile`, `updateFileMetadata` in `mediaRepository.js` operate by `fileId` only — no `project_id` constraint in queries.
- **widgetizer-app**: Already fixed — all repo methods require `websiteId`, queries use `WHERE id = ? AND website_id = ?`.
- **Action**: Port the widgetizer-app pattern to widgetizer. Add `projectId` to all media repo methods and enforce in SQL. Update controller/service call sites.

---

## 2) `P1` Video/audio `description` not persisted

- Both codebases have this issue — no `description` column in `media_files`, repo ignores it, controller accepts but never saves it.
- **Action**: Decide — add `description` column (migration v2) and wire through repo/controller, or remove from API contract. Apply to both codebases.

---

## 3) `P1` Legacy `getMediaUrl` helper (widgetizer only)

- `src/queries/mediaManager.js` still builds `/uploads/originals|thumbnails/:fileId` paths that don't match current routes.
- widgetizer-app has no equivalent (components build URLs inline with current API paths).
- **Action**: Remove or update the helper. Update JSDoc typedefs in same file.

---

## 4) `P1` `receiveThemeUpdates` stored but not enforced (widgetizer only)

- Preference is persisted but `hasThemeUpdate` is set without checking the flag. No UI toggle exists.
- widgetizer-app doesn't have this feature at all.
- **Action**: Decide — either enforce the flag in project listing and add UI toggle, or remove the toggle endpoint/field entirely.

---

## 5) `P2` Controller-to-service coupling for media reads (widgetizer only)

- `renderingService.js` imports `readMediaFile` from `mediaController`. `exportController.js` has 3 dynamic imports of it.
- widgetizer-app already refactored — uses `mediaRepo` directly.
- **Action**: Extract media reads to service/repository. Replace controller imports.

---

## 6) Transfer responsive images to widgetizer-app

- Responsive `srcset` support implemented in widgetizer on `{% image %}` tag and `card-grid` widget. Remaining widgets still need `srcset: true`.
- **Action**: Port the responsive images implementation to widgetizer-app. See `docs-llms/future-responsive-images-rollout.md` for full details.

---

## Already resolved

- **Folder name uniqueness** (`P1`): Fixed in both codebases — `generateUniqueSlug` callbacks use `projectFolderExists()` checking the `folder_name` column correctly.
