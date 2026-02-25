# Future SQLite Upgrade Findings

> Goal: consolidate all post-migration follow-ups into one sprint plan.
>
> Scope: issues discovered after moving metadata from JSON files to SQLite.

---

## Summary

This document captures concrete technical debt and defects related to the SQLite migration, with implementation guidance and sprint-ready acceptance criteria.

Priority legend:
- `P0` critical security/data integrity
- `P1` correctness/consistency
- `P2` cleanup/architecture hardening

---

## Findings

### 1) `P0` Media-by-ID operations are not scoped to project/user

**Problem**
- Several media repository methods operate by `fileId` only.
- Controllers validate `projectId`, but then load/update/delete by `fileId` without proving the file belongs to that project/user.

**Code references**
- [`server/db/repositories/mediaRepository.js:46`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/db/repositories/mediaRepository.js:46) `getMediaFileById(fileId)`
- [`server/db/repositories/mediaRepository.js:106`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/db/repositories/mediaRepository.js:106) `deleteMediaFile(fileId)`
- [`server/db/repositories/mediaRepository.js:131`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/db/repositories/mediaRepository.js:131) `updateFileMetadata(fileId, ...)`
- [`server/controllers/mediaController.js:483`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/mediaController.js:483)
- [`server/controllers/mediaController.js:535`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/mediaController.js:535)
- [`server/services/mediaUsageService.js:260`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/services/mediaUsageService.js:260)

**Risk**
- Cross-project metadata mutation/deletion by ID (and potentially cross-user if IDs leak).

**Fix**
- Add scoped repo methods:
  - `getMediaFileById(projectId, fileId, userId)`
  - `updateFileMetadata(projectId, fileId, userId, metadata)`
  - `deleteMediaFile(projectId, fileId, userId)`
- Require `project_id` + `user_id` constraints in all these queries.
- Update controller/service call sites to use scoped methods only.

**Acceptance criteria**
- Attempting to mutate/delete a file not belonging to route `projectId` returns `404`.
- Attempting cross-user access returns `404`/`403`.
- Existing happy paths remain unchanged.

---

### 2) `P1` Folder name uniqueness checks compare against project UUIDs

**Problem**
- `generateUniqueSlug` callbacks compare candidate folder slug against `project.id` instead of `project.folderName`.

**Code references**
- [`server/controllers/projectController.js:167`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/projectController.js:167)
- [`server/controllers/projectController.js:479`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/projectController.js:479)
- [`server/controllers/projectController.js:943`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/projectController.js:943)

**Risk**
- Slug collisions are not prevented correctly.
- Can surface as DB unique constraint failures (`folder_name,user_id`) or confusing import/duplicate errors.

**Fix**
- Replace callback checks with `p.folderName === slug`.
- Keep directory existence fallback loop for import as secondary safety.

**Acceptance criteria**
- Create/duplicate/import all generate unique `folderName` deterministically.
- No SQLite unique constraint error for normal collision scenarios.

---

### 3) `P1` Video/audio `description` accepted by API but not persisted

**Problem**
- API accepts `description` and returns it in response metadata for video/audio.
- SQLite schema/repository persist only `alt` and `title`.

**Code references**
- [`server/controllers/mediaController.js:467`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/mediaController.js:467)
- [`server/controllers/mediaController.js:504`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/mediaController.js:504)
- [`server/db/migrations.js:35`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/db/migrations.js:35) (`media_files` has no `description`)
- [`server/db/repositories/mediaRepository.js:131`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/db/repositories/mediaRepository.js:131)

**Risk**
- Users think description is saved, but it is lost after reload.

**Fix options**
- Option A (recommended): add `description` column in migration v2 and wire through repository/controller.
- Option B: remove `description` from API contract/UI until persistence exists.

**Acceptance criteria**
- If API accepts `description`, value survives reload and appears in subsequent GET responses.

---

### 4) `P1` Frontend media URL helper uses legacy/nonexistent path contract

**Problem**
- `getMediaUrl()` builds `/uploads/originals|thumbnails/:fileId`, which does not exist in current media routes.

**Code references**
- [`src/queries/mediaManager.js:309`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/src/queries/mediaManager.js:309)

**Risk**
- Silent break if this helper gets used.
- Misleading API contract for future contributors.

**Fix**
- Update helper to current contract (`/api/media/projects/:projectId/media/:fileId` or filename-based uploads path).
- Or remove helper if unused (currently appears unused).
- Update JSDoc typedefs in same file to match actual API shape.

**Acceptance criteria**
- Helper removed or returns working URLs matching `server/routes/media.js`.

---

### 5) `P1` `receiveThemeUpdates` preference is stored but not enforced in project listing UX

**Problem**
- Preference can be toggled via API and is persisted.
- Project list update indicator (`hasThemeUpdate`) does not consider this flag.
- No UI currently exposes the toggle.

**Code references**
- [`server/services/themeUpdateService.js:333`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/services/themeUpdateService.js:333)
- [`server/controllers/projectController.js:45`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/projectController.js:45)
- [`src/pages/Projects.jsx:225`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/src/pages/Projects.jsx:225)

**Risk**
- Product behavior inconsistency: “toggle preference” exists but effectively does nothing in UI flow.

**Fix**
- Decide product rule:
  - Rule A: flag suppresses update indicators/notifications.
  - Rule B: remove toggle endpoint/field entirely.
- Implement consistently across backend response shaping and frontend rendering.

**Acceptance criteria**
- Behavior is explicit and test-covered; no dead preference flag.

---

### 6) `P2` Controller-to-service coupling remains in media access path

**Problem**
- Services/controllers import media read logic from controller layer.
- `exportController` dynamically imports `readMediaFile` from `mediaController`.

**Code references**
- [`server/services/renderingService.js:5`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/services/renderingService.js:5)
- [`server/controllers/exportController.js:473`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/exportController.js:473)
- [`server/controllers/exportController.js:546`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/exportController.js:546)
- [`server/controllers/exportController.js:602`](/Users/tsiger/Playground/widgetizer-saas/widgetizer/server/controllers/exportController.js:602)

**Risk**
- Layering violation and brittle dependencies.
- Harder to test and reason about as SQLite ownership grows.

**Fix**
- Extract media metadata reads to a dedicated service/repository adapter (non-controller module).
- Replace dynamic imports with direct dependency.

**Acceptance criteria**
- No service imports from controller modules for media metadata access.

---

## Suggested One-Sprint Plan

### Sprint backlog
1. `P0` Scope media-by-ID operations by `projectId` + `userId`.
2. `P1` Fix folderName uniqueness callback bugs.
3. `P1` Resolve `description` persistence mismatch (migration v2 or API contract rollback).
4. `P1` Fix/remove legacy `getMediaUrl` helper and align typedef docs.
5. `P1` Decide and implement `receiveThemeUpdates` behavior.
6. `P2` Refactor controller-coupled media reads into service/repository layer.

### Test plan additions
- Add cross-project/cross-user media mutation tests (must fail).
- Add create/duplicate/import slug collision tests.
- Add video/audio metadata roundtrip test for `description` (if persisted).
- Add frontend unit test or integration check for media URL helper (if kept).
- Add theme update preference behavior tests (enabled vs disabled path).

---

## Definition of Done

- All `P0/P1` items merged with tests.
- No legacy media URL contracts left in query helpers.
- No unscoped `fileId`-only media mutations.
- Migration notes documented if schema v2 is introduced.
