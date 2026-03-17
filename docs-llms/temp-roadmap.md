# Temp Roadmap

> Items to address — targeting next session. Last reviewed: 2026-03-17.

---

## 1) `P0` Media-by-ID operations not scoped to project

- **widgetizer**: `getMediaFileById`, `deleteMediaFile`, `deleteMediaFiles`, `updateFileMetadata` in `mediaRepository.js` operate by `fileId` only — no `project_id` constraint in SQL queries. Controllers validate project existence via `getProjectFolderName(projectId)` but never pass `projectId` down to the repository, so the actual DB operations are unscoped.
- **widgetizer-app**: Fixed — all repo methods require `websiteId`, queries use `WHERE id = ? AND website_id = ?`.
- **Action**: Port the widgetizer-app pattern to widgetizer. Add `projectId` to all media repo methods and enforce in SQL. Controllers already have `projectId` from `req.params` — just pass it through.

---

## 2) `P1` Video/audio `description` not persisted

- Both codebases have this issue — no `description` column in `media_files` table.
- **widgetizer**: Controller reads and sanitizes `req.body.description`, repo JSDoc declares it in the param type, but SQL only persists `alt` and `title`. `description` is silently dropped. `rowToMediaFile` hardcodes `description: ""` for video/audio.
- **widgetizer-app**: Controller doesn't even extract `description` from the request body. Repo has no support. Same `description: ""` hardcoding in `rowToMediaFile`.
- **Action**: Decide — add `description` column (new migration) and wire through repo/controller in both codebases, or remove from API contract and JSDoc types. Apply consistently.

---

## 3) `P2` Legacy `getMediaUrl` helper (widgetizer only)

- `src/queries/mediaManager.js` has a `getMediaUrl` function (line 302) that builds `/api/media/projects/:projectId/uploads/originals|thumbnails/:fileId` paths. No server route matches this pattern — actual routes use `/projects/:projectId/media/:fileId` and `/projects/:projectId/uploads/images|videos|audios/:filename`.
- The function is dead code — not imported or called anywhere in `src/`. Already flagged in `docs-llms/dead-code.md`.
- widgetizer-app has no equivalent.
- **Action**: Remove the function and update JSDoc typedefs in the same file.

---

## 4) `P1` `receiveThemeUpdates` stored but not enforced (widgetizer only)

- `receive_theme_updates` column exists in `projects` table and is persisted on create/update/duplicate/import.
- Backend toggle endpoint exists: `themeUpdateService.toggleThemeUpdates()` exposed via `projectController.toggleProjectThemeUpdates`.
- `getAllProjects()` computes `hasThemeUpdate` by comparing `project.themeVersion` against `themeData.version` — never checks `receiveThemeUpdates` before setting the flag.
- No UI toggle on the frontend — zero references to `receiveThemeUpdates` in `src/`.
- widgetizer-app doesn't have this feature at all.
- **Action**: Decide — either enforce the flag in `getAllProjects()` and add a UI toggle in the project settings, or remove the toggle endpoint, DB column, and all references entirely.

---

## 5) `P2` Controller-to-service coupling for media reads (widgetizer only)

- `renderingService.js` line 7: `import { readMediaFile } from "../controllers/mediaController.js"` — even has a TODO comment acknowledging the problem. Used at line 347.
- `exportController.js` has 3 dynamic imports of `readMediaFile` from `./mediaController.js` (lines 465, 540, 596).
- No `mediaService.js` exists in widgetizer.
- **widgetizer-app**: Already refactored — `exportController.js` imports from `mediaRepo` directly. No `readMediaFile` function exists.
- **Action**: Extract media file reading into a service or shared utility. Replace controller imports in `renderingService` and `exportController`.

---

## Already resolved

- **Responsive images transfer** (`P1`): Completed — widgetizer-app now has the `{% image %}` tag with full `srcset` support (`src/core/tags/imageTag.js`), comprehensive tests (`server/tests/imageTag.test.js`), and all applicable widgets use `srcset: true` (card-grid, comparison-slider, content-switcher, image, image-tabs, gallery, masonry-gallery, image-hotspots, image-callout, profile-grid, project-showcase, testimonial-hero, image-text). The rollout planning doc (`future-responsive-images-rollout.md`) has been cleaned up.

- **Folder name uniqueness** (`P1`): Fixed in widgetizer — `generateUniqueSlug` callbacks use `projectRepo.projectFolderExists()` checking the `folder_name` column. **Not fully fixed in widgetizer-app** — `generateFolderName(name)` is a simple slugify with no DB uniqueness check. `projectFolderExists` does not exist. Collision risk is reduced by per-user directory scoping (`data/users/{userId}/websites/{folderName}/`), but same-user duplicate folder names are still possible.
